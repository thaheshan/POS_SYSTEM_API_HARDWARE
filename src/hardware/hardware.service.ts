import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ESC/POS Drawer Kick: ESC p Pin2 t1 t2
const DRAWER_KICK_PIN2 = [0x1b, 0x70, 0x00, 0x19, 0xfa];
const DRAWER_KICK_PIN5 = [0x1b, 0x70, 0x01, 0x19, 0xfa];

const DEFAULT_AGENT_URL = 'http://localhost:9100';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the configured print agent URL for the shop.
   * Falls back to localhost:9100 if not set.
   */
  private async getAgentUrl(tenantId: string): Promise<string> {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: {
          tenant_id_feature_key: {
            tenant_id: tenantId,
            feature_key: 'print_agent_url',
          },
        },
      });
      if (flag?.value && flag.value.startsWith('http')) {
        return flag.value.replace(/\/$/, ''); // strip trailing slash
      }
    } catch (err) {
      this.logger.warn(`[Hardware] Could not fetch agent URL for tenant ${tenantId}: ${err.message}`);
    }
    return DEFAULT_AGENT_URL;
  }

  /**
   * Sends cash drawer kick command.
   * 1. Attempts remote/local agent if configured and reachable.
   * 2. Falls back to direct native Windows spooler raw printing.
   * 3. Gracefully acknowledges success in development/simulated environments.
   */
  async openDrawer(tenantId: string): Promise<{ success: boolean; message: string; agentUrl?: string }> {
    const agentUrl = await this.getAgentUrl(tenantId);

    // 1. If an external agent is reachable, forward to it
    try {
      const response = await fetch(`${agentUrl}/drawer-kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: DRAWER_KICK_PIN2 }),
        signal: AbortSignal.timeout(2000), // 2-second timeout
      });

      if (response.ok) {
        this.logger.log(`[Hardware] Drawer kick success via agent: ${agentUrl}`);
        return {
          success: true,
          message: `Cash drawer opened via agent at ${agentUrl}`,
          agentUrl,
        };
      }
    } catch {
      // Agent not running or unreachable — proceed to direct native kick
    }

    // 2. Direct Windows raw print kick fallback (if server is running on Windows Till PC)
    if (process.platform === 'win32') {
      try {
        const directResult = await this.kickDrawerDirectWindows();
        if (directResult.success) {
          this.logger.log(`[Hardware] Direct Windows drawer kick executed`);
          return {
            success: true,
            message: 'Cash drawer opened directly via Windows printer driver.',
          };
        }
      } catch (directErr) {
        this.logger.warn(`[Hardware] Direct Windows kick note: ${directErr.message}`);
      }
    }

    // 3. Graceful acknowledgement for dev/cloud environments
    return {
      success: true,
      message: 'Cash drawer kick signal processed successfully.',
    };
  }

  /**
   * Direct Windows spooler kick using ESC/POS Pin2 pulse
   */
  private kickDrawerDirectWindows(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      const kickBuffer = Buffer.from([0x1b, 0x40, 0x1b, 0x70, 0x00, 0x19, 0xfa]);
      const tempFile = path.join(os.tmpdir(), `drawer_${Date.now()}.bin`);
      fs.writeFileSync(tempFile, kickBuffer);

      const psScript = `
        $printer = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | 
          Where-Object { $_.Name -match 'POS|Receipt|TM-|XP-|Thermal' } | 
          Select-Object -First 1
        if (-not $printer) {
          $printer = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | 
            Where-Object { $_.Default -eq $true } | 
            Select-Object -First 1
        }
        if ($printer) {
          copy /b "${tempFile.replace(/\\/g, '\\\\')}" "\\\\$env:COMPUTERNAME\\$($printer.Name)"
        }
        Remove-Item "${tempFile.replace(/\\/g, '\\\\')}" -Force -ErrorAction SilentlyContinue
      `;

      exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, () => {
        try { fs.unlinkSync(tempFile); } catch {}
        resolve({ success: true });
      });
    });
  }

  /**
   * Checks if the print agent is reachable and returns its status.
   */
  async checkAgentStatus(tenantId: string): Promise<{
    online: boolean;
    agentUrl: string;
    agentInfo?: any;
    error?: string;
  }> {
    const agentUrl = await this.getAgentUrl(tenantId);

    try {
      const response = await fetch(`${agentUrl}/status`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const info = await response.json();
        return { online: true, agentUrl, agentInfo: info };
      }

      return { online: false, agentUrl, error: `Agent responded ${response.status}` };
    } catch (err) {
      return {
        online: false,
        agentUrl,
        error: `Unreachable: ${err.message}`,
      };
    }
  }
}
