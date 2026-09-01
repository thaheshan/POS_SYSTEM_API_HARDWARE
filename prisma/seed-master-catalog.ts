import { PrismaClient, TaxCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type MasterProduct = {
  name: string; sku: string; barcode: string;
  category: string; subcategory?: string; brand?: string | null;
  unit: { name: string; abbr: string };
  sellType: string; measurementUnit: string;
  image?: string | null;
  aliases?: string[]; // Multi-name search aliases
};

const MASTER_PRODUCTS: MasterProduct[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. CEMENT & CONCRETE (001-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Holcim Cement 50kg', sku:'MC-CEM-001', barcode:'4000100000001', category:'Cement', brand:'Holcim', unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['holcim','sement','simint','cement bag','binding powder','concrete powder','OPC','ordinary portland cement','grey cement','sudu adu'] },
  { name:'Tokyo Cement 50kg', sku:'MC-CEM-002', barcode:'4000100000002', category:'Cement', brand:'Tokyo Cement', unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['tokyo cement','tokyo','blue bag cement','sement','simint','OPC','binding powder'] },
  { name:'Sanstha Cement 50kg', sku:'MC-CEM-003', barcode:'4000100000003', category:'Cement', brand:'Sanstha', unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['sanstha','santha cement','sement','simint','OPC'] },
  { name:'Puttalam Cement 50kg', sku:'MC-CEM-004', barcode:'4000100000004', category:'Cement', brand:'Puttalam', unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['puttalam','puttala cement','sement','simint','OPC'] },
  { name:'Ultratech Cement 50kg', sku:'MC-CEM-005', barcode:'4000100000005', category:'Cement', brand:'Ultratech', unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['ultratech','ultra tech','sement','simint','OPC'] },
  { name:'White Cement 2kg', sku:'MC-CEM-006', barcode:'4000100000006', category:'Cement', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['white cement','sudu sement','whitewash cement','wall putty cement','finishing cement'] },
  { name:'White Cement 5kg', sku:'MC-CEM-007', barcode:'4000100000007', category:'Cement', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['white cement','sudu sement','whitewash cement','wall putty cement'] },
  { name:'White Cement 10kg', sku:'MC-CEM-008', barcode:'4000100000008', category:'Cement', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['white cement','sudu sement','whitewash cement'] },
  { name:'Rapid Set Cement 5kg', sku:'MC-CEM-009', barcode:'4000100000009', category:'Cement', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['rapid set','fast cement','quick cement','sethiye sement','express cement','quick set'] },
  { name:'Rapid Set Cement 25kg', sku:'MC-CEM-010', barcode:'4000100000010', category:'Cement', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag', aliases:['rapid set','fast cement','quick cement','sethiye sement'] },
  { name:'Ready Mix Concrete (per m³)', sku:'MC-CEM-011', barcode:'4000100000011', category:'Cement', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['ready mix','readymix','RMC','ready mixed concrete','concrete mix','premix','mixed concrete'] },
  { name:'Cement Bags Bulk (per ton)', sku:'MC-CEM-012', barcode:'4000100000012', category:'Cement', brand:null, unit:{name:'Ton',abbr:'ton'}, sellType:'loose', measurementUnit:'ton', aliases:['bulk cement','ton cement','sement ton'] },

  // ═══════════════════════════════════════════════════════════════════
  // 2. SAND & AGGREGATES (002-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'River Sand (per m³)', sku:'MC-AGG-001', barcode:'4000200000001', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['river sand','wali','nadi wali','fine aggregate','building sand','construction sand','sudu wali','sand','fine sand'] },
  { name:'Plastering Sand (per m³)', sku:'MC-AGG-002', barcode:'4000200000002', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['plastering sand','plaster sand','smooth sand','render sand','sudu wali','finishing sand','paint sand'] },
  { name:'Coarse Sand (per m³)', sku:'MC-AGG-003', barcode:'4000200000003', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['coarse sand','rough sand','katu wali','kata wali','concrete sand'] },
  { name:'Fine Sand (per m³)', sku:'MC-AGG-004', barcode:'4000200000004', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['fine sand','sudu wali','smooth sand','wali'] },
  { name:'Crushed Metal 3/4 inch (per m³)', sku:'MC-AGG-005', barcode:'4000200000005', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['crushed metal','metal','stone chips','aggregate','granite chips','kankun','kanku','karankun','road metal','jelly','3/4 metal','3 quarter metal'] },
  { name:'Crushed Metal 1/2 inch (per m³)', sku:'MC-AGG-006', barcode:'4000200000006', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['crushed metal','metal','stone chips','aggregate','kankun','jelly','half inch metal'] },
  { name:'Crushed Metal 3/8 inch (per m³)', sku:'MC-AGG-007', barcode:'4000200000007', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['crushed metal','metal','stone chips','aggregate','kankun','jelly','3/8 metal'] },
  { name:'Gravel 20mm (per m³)', sku:'MC-AGG-008', barcode:'4000200000008', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['gravel','pebble','stone','gal','small stone','gravel 20mm'] },
  { name:'Gravel 40mm (per m³)', sku:'MC-AGG-009', barcode:'4000200000009', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['gravel','pebble','stone','gal','large stone','gravel 40mm'] },
  { name:'Quarry Dust (per m³)', sku:'MC-AGG-010', barcode:'4000200000010', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['quarry dust','stone dust','crusher dust','decomposed granite','quarry powder'] },
  { name:'Laterite (Red Soil) per m³', sku:'MC-AGG-011', barcode:'4000200000011', category:'Aggregates', brand:null, unit:{name:'Cubic Meter',abbr:'m³'}, sellType:'loose', measurementUnit:'m³', aliases:['laterite','red soil','red earth','clay soil','fill material','subsoil','lateritic soil'] },
  { name:'Concrete Blocks 6 inch', sku:'MC-AGG-012', barcode:'4000200000012', category:'Aggregates', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs', aliases:['concrete block','cement block','hollow block','CB','siment block','wall block','6 inch block','solid block'] },
  { name:'Concrete Blocks 4 inch', sku:'MC-AGG-013', barcode:'4000200000013', category:'Aggregates', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs', aliases:['concrete block','cement block','4 inch block','siment block','small block'] },
  { name:'Clay Bricks Standard', sku:'MC-AGG-014', barcode:'4000200000014', category:'Aggregates', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs', aliases:['clay brick','brick','red brick','wall brick','ibba','fired brick','kiln brick','common brick','building brick'] },
  { name:'Hollow Block 8 inch', sku:'MC-AGG-015', barcode:'4000200000015', category:'Aggregates', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs', aliases:['hollow block','8 inch block','large block','concrete hollow block'] },
  { name:'Interlock Paving Block', sku:'MC-AGG-016', barcode:'4000200000016', category:'Aggregates', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs', aliases:['paving block','interlock','paver','driveway block','garden paver','floor block','kerb stone','outdoor paving'] },

  // ═══════════════════════════════════════════════════════════════════
  // 3. STEEL & METAL (003-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Deformed Bar 8mm (per kg)', sku:'MC-STL-001', barcode:'4000300000001', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Deformed Bar 10mm (per kg)', sku:'MC-STL-002', barcode:'4000300000002', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Deformed Bar 12mm (per kg)', sku:'MC-STL-003', barcode:'4000300000003', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Deformed Bar 16mm (per kg)', sku:'MC-STL-004', barcode:'4000300000004', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Deformed Bar 20mm (per kg)', sku:'MC-STL-005', barcode:'4000300000005', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Deformed Bar 25mm (per kg)', sku:'MC-STL-006', barcode:'4000300000006', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Deformed Bar 32mm (per kg)', sku:'MC-STL-007', barcode:'4000300000007', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Mild Steel Round Bar 6mm (per kg)', sku:'MC-STL-008', barcode:'4000300000008', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Mild Steel Round Bar 8mm (per kg)', sku:'MC-STL-009', barcode:'4000300000009', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Mild Steel Flat Bar 25x3mm (per m)', sku:'MC-STL-010', barcode:'4000300000010', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Mild Steel Flat Bar 40x5mm (per m)', sku:'MC-STL-011', barcode:'4000300000011', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Mild Steel Angle Iron 25x25x3mm (per m)', sku:'MC-STL-012', barcode:'4000300000012', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Mild Steel Angle Iron 40x40x4mm (per m)', sku:'MC-STL-013', barcode:'4000300000013', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Mild Steel Angle Iron 50x50x5mm (per m)', sku:'MC-STL-014', barcode:'4000300000014', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Mild Steel Angle Iron 65x65x6mm (per m)', sku:'MC-STL-015', barcode:'4000300000015', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Channel 75x40mm (per m)', sku:'MC-STL-016', barcode:'4000300000016', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Channel 100x50mm (per m)', sku:'MC-STL-017', barcode:'4000300000017', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel I-Beam 100x50mm (per m)', sku:'MC-STL-018', barcode:'4000300000018', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel I-Beam 150x75mm (per m)', sku:'MC-STL-019', barcode:'4000300000019', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Square Hollow 25x25mm (per m)', sku:'MC-STL-020', barcode:'4000300000020', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Square Hollow 40x40mm (per m)', sku:'MC-STL-021', barcode:'4000300000021', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Square Hollow 50x50mm (per m)', sku:'MC-STL-022', barcode:'4000300000022', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Rectangular Hollow 40x20mm (per m)', sku:'MC-STL-023', barcode:'4000300000023', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Rectangular Hollow 60x40mm (per m)', sku:'MC-STL-024', barcode:'4000300000024', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'GI Sheet 0.5mm 4x8ft', sku:'MC-STL-025', barcode:'4000300000025', category:'Steel', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'GI Sheet 0.8mm 4x8ft', sku:'MC-STL-026', barcode:'4000300000026', category:'Steel', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'GI Sheet 1.0mm 4x8ft', sku:'MC-STL-027', barcode:'4000300000027', category:'Steel', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'GI Wire 1.6mm (per kg)', sku:'MC-STL-028', barcode:'4000300000028', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'GI Wire 2.0mm (per kg)', sku:'MC-STL-029', barcode:'4000300000029', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Barbed Wire (per roll)', sku:'MC-STL-030', barcode:'4000300000030', category:'Steel', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'Chain Link Fencing 4ft (per m)', sku:'MC-STL-031', barcode:'4000300000031', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Chain Link Fencing 6ft (per m)', sku:'MC-STL-032', barcode:'4000300000032', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Mesh 6x6 inch (sheet)', sku:'MC-STL-033', barcode:'4000300000033', category:'Steel', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'GI Pipe 1/2 inch (per m)', sku:'MC-STL-034', barcode:'4000300000034', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'GI Pipe 3/4 inch (per m)', sku:'MC-STL-035', barcode:'4000300000035', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'GI Pipe 1 inch (per m)', sku:'MC-STL-036', barcode:'4000300000036', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'GI Pipe 2 inch (per m)', sku:'MC-STL-037', barcode:'4000300000037', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'GI Pipe 3 inch (per m)', sku:'MC-STL-038', barcode:'4000300000038', category:'Steel', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Stainless Steel Sheet 1mm 4x8ft', sku:'MC-STL-039', barcode:'4000300000039', category:'Steel', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Aluminium Sheet 1mm 4x8ft', sku:'MC-STL-040', barcode:'4000300000040', category:'Steel', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Copper Sheet 0.5mm (per kg)', sku:'MC-STL-041', barcode:'4000300000041', category:'Steel', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },

  // ═══════════════════════════════════════════════════════════════════
  // 4. PVC & UPVC PIPES (004-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'PVC Pipe 1/2 inch Class B (per m)', sku:'MC-PVC-001', barcode:'4000400000001', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 1/2 inch Class C (per m)', sku:'MC-PVC-002', barcode:'4000400000002', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 3/4 inch Class B (per m)', sku:'MC-PVC-003', barcode:'4000400000003', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 3/4 inch Class C (per m)', sku:'MC-PVC-004', barcode:'4000400000004', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 1 inch Class B (per m)', sku:'MC-PVC-005', barcode:'4000400000005', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 1 inch Class C (per m)', sku:'MC-PVC-006', barcode:'4000400000006', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 1.5 inch Class B (per m)', sku:'MC-PVC-007', barcode:'4000400000007', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 2 inch Class B (per m)', sku:'MC-PVC-008', barcode:'4000400000008', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 3 inch Class B (per m)', sku:'MC-PVC-009', barcode:'4000400000009', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 4 inch Class B (per m)', sku:'MC-PVC-010', barcode:'4000400000010', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Pipe 6 inch (per m)', sku:'MC-PVC-011', barcode:'4000400000011', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'UPVC Pipe 1/2 inch (per m)', sku:'MC-PVC-012', barcode:'4000400000012', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'UPVC Pipe 1 inch (per m)', sku:'MC-PVC-013', barcode:'4000400000013', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'UPVC Pipe 2 inch (per m)', sku:'MC-PVC-014', barcode:'4000400000014', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'HDPE Pipe 25mm (per m)', sku:'MC-PVC-015', barcode:'4000400000015', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'HDPE Pipe 32mm (per m)', sku:'MC-PVC-016', barcode:'4000400000016', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'HDPE Pipe 50mm (per m)', sku:'MC-PVC-017', barcode:'4000400000017', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PPR Pipe 20mm (per m)', sku:'MC-PVC-018', barcode:'4000400000018', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PPR Pipe 25mm (per m)', sku:'MC-PVC-019', barcode:'4000400000019', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PPR Pipe 32mm (per m)', sku:'MC-PVC-020', barcode:'4000400000020', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Flexible Hose 1/2 inch (per m)', sku:'MC-PVC-021', barcode:'4000400000021', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Garden Hose 1/2 inch (per m)', sku:'MC-PVC-022', barcode:'4000400000022', category:'Plumbing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 5. PIPE FITTINGS - PVC (005-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'PVC Elbow 90° 1/2 inch', sku:'MC-FIT-001', barcode:'4000500000001', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Elbow 90° 3/4 inch', sku:'MC-FIT-002', barcode:'4000500000002', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Elbow 90° 1 inch', sku:'MC-FIT-003', barcode:'4000500000003', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Elbow 90° 2 inch', sku:'MC-FIT-004', barcode:'4000500000004', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Elbow 90° 3 inch', sku:'MC-FIT-005', barcode:'4000500000005', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Elbow 45° 1/2 inch', sku:'MC-FIT-006', barcode:'4000500000006', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Elbow 45° 1 inch', sku:'MC-FIT-007', barcode:'4000500000007', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Tee 1/2 inch', sku:'MC-FIT-008', barcode:'4000500000008', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Tee 3/4 inch', sku:'MC-FIT-009', barcode:'4000500000009', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Tee 1 inch', sku:'MC-FIT-010', barcode:'4000500000010', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Tee 2 inch', sku:'MC-FIT-011', barcode:'4000500000011', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Coupler 1/2 inch', sku:'MC-FIT-012', barcode:'4000500000012', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Coupler 3/4 inch', sku:'MC-FIT-013', barcode:'4000500000013', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Coupler 1 inch', sku:'MC-FIT-014', barcode:'4000500000014', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Coupler 2 inch', sku:'MC-FIT-015', barcode:'4000500000015', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Reducer 1x1/2 inch', sku:'MC-FIT-016', barcode:'4000500000016', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Reducer 2x1 inch', sku:'MC-FIT-017', barcode:'4000500000017', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC End Cap 1/2 inch', sku:'MC-FIT-018', barcode:'4000500000018', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC End Cap 1 inch', sku:'MC-FIT-019', barcode:'4000500000019', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC End Cap 2 inch', sku:'MC-FIT-020', barcode:'4000500000020', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Male Adaptor 1/2 inch', sku:'MC-FIT-021', barcode:'4000500000021', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Male Adaptor 1 inch', sku:'MC-FIT-022', barcode:'4000500000022', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Female Adaptor 1/2 inch', sku:'MC-FIT-023', barcode:'4000500000023', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Female Adaptor 1 inch', sku:'MC-FIT-024', barcode:'4000500000024', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Union 1/2 inch', sku:'MC-FIT-025', barcode:'4000500000025', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Union 1 inch', sku:'MC-FIT-026', barcode:'4000500000026', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Union 2 inch', sku:'MC-FIT-027', barcode:'4000500000027', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Cross Tee 1/2 inch', sku:'MC-FIT-028', barcode:'4000500000028', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Cross Tee 1 inch', sku:'MC-FIT-029', barcode:'4000500000029', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Inspection Chamber 4 inch', sku:'MC-FIT-030', barcode:'4000500000030', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC P-Trap 1.5 inch', sku:'MC-FIT-031', barcode:'4000500000031', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC P-Trap 2 inch', sku:'MC-FIT-032', barcode:'4000500000032', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Floor Trap 3 inch', sku:'MC-FIT-033', barcode:'4000500000033', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 6. PLUMBING FIXTURES & VALVES (006-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Brass Ball Valve 1/2 inch', sku:'MC-PLF-001', barcode:'4000600000001', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Brass Ball Valve 3/4 inch', sku:'MC-PLF-002', barcode:'4000600000002', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Brass Ball Valve 1 inch', sku:'MC-PLF-003', barcode:'4000600000003', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Brass Ball Valve 2 inch', sku:'MC-PLF-004', barcode:'4000600000004', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Gate Valve Brass 1/2 inch', sku:'MC-PLF-005', barcode:'4000600000005', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Gate Valve Brass 1 inch', sku:'MC-PLF-006', barcode:'4000600000006', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Gate Valve Brass 2 inch', sku:'MC-PLF-007', barcode:'4000600000007', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Check Valve 1/2 inch', sku:'MC-PLF-008', barcode:'4000600000008', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Check Valve 1 inch', sku:'MC-PLF-009', barcode:'4000600000009', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Water Tap Single Hole', sku:'MC-PLF-010', barcode:'4000600000010', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Water Tap Double Hole Mixer', sku:'MC-PLF-011', barcode:'4000600000011', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Shower Head Standard', sku:'MC-PLF-012', barcode:'4000600000012', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Shower Head Rain Type', sku:'MC-PLF-013', barcode:'4000600000013', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'WC Cistern Flush Valve', sku:'MC-PLF-014', barcode:'4000600000014', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'WC Float Valve 1/2 inch', sku:'MC-PLF-015', barcode:'4000600000015', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flexible Connector 30cm', sku:'MC-PLF-016', barcode:'4000600000016', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flexible Connector 50cm', sku:'MC-PLF-017', barcode:'4000600000017', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Water Tank Float Valve', sku:'MC-PLF-018', barcode:'4000600000018', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pressure Reducing Valve 1 inch', sku:'MC-PLF-019', barcode:'4000600000019', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Water Meter 1/2 inch', sku:'MC-PLF-020', barcode:'4000600000020', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sink Strainer Stainless', sku:'MC-PLF-021', barcode:'4000600000021', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Plumber Putty 500g', sku:'MC-PLF-022', barcode:'4000600000022', category:'Plumbing', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Pipe Thread Seal Tape (PTFE)', sku:'MC-PLF-023', barcode:'4000600000023', category:'Plumbing', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'PVC Solvent Cement 100ml', sku:'MC-PLF-024', barcode:'4000600000024', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Solvent Cement 500ml', sku:'MC-PLF-025', barcode:'4000600000025', category:'Plumbing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 7. SANITARY WARE (007-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Western Toilet Bowl Standard', sku:'MC-SAN-001', barcode:'4000700000001', category:'Sanitary Ware', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Toilet Cistern Only', sku:'MC-SAN-002', barcode:'4000700000002', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Squat Toilet Pan', sku:'MC-SAN-003', barcode:'4000700000003', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wall Hung Basin Small', sku:'MC-SAN-004', barcode:'4000700000004', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wall Hung Basin Large', sku:'MC-SAN-005', barcode:'4000700000005', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pedestal Basin', sku:'MC-SAN-006', barcode:'4000700000006', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Kitchen Sink Stainless Single Bowl', sku:'MC-SAN-007', barcode:'4000700000007', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Kitchen Sink Stainless Double Bowl', sku:'MC-SAN-008', barcode:'4000700000008', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Bath Tub Acrylic 1500mm', sku:'MC-SAN-009', barcode:'4000700000009', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Toilet Seat & Cover Standard', sku:'MC-SAN-010', barcode:'4000700000010', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Towel Rail Single 600mm', sku:'MC-SAN-011', barcode:'4000700000011', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Toilet Paper Holder Wall', sku:'MC-SAN-012', barcode:'4000700000012', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Soap Dish Wall Mounted', sku:'MC-SAN-013', barcode:'4000700000013', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Urinal Wall Hung', sku:'MC-SAN-014', barcode:'4000700000014', category:'Sanitary Ware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 8. ELECTRICAL WIRE & CABLE (008-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Copper PVC Wire 1.5mm (per m)', sku:'MC-EWR-001', barcode:'4000800000001', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Copper PVC Wire 2.5mm (per m)', sku:'MC-EWR-002', barcode:'4000800000002', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Copper PVC Wire 4mm (per m)', sku:'MC-EWR-003', barcode:'4000800000003', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Copper PVC Wire 6mm (per m)', sku:'MC-EWR-004', barcode:'4000800000004', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Copper PVC Wire 10mm (per m)', sku:'MC-EWR-005', barcode:'4000800000005', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Copper PVC Wire 16mm (per m)', sku:'MC-EWR-006', barcode:'4000800000006', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'2 Core Flat Cable 1.5mm (per m)', sku:'MC-EWR-007', barcode:'4000800000007', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'2 Core Flat Cable 2.5mm (per m)', sku:'MC-EWR-008', barcode:'4000800000008', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'3 Core Flat Cable 1.5mm (per m)', sku:'MC-EWR-009', barcode:'4000800000009', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'3 Core Flat Cable 2.5mm (per m)', sku:'MC-EWR-010', barcode:'4000800000010', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'4 Core Flat Cable 2.5mm (per m)', sku:'MC-EWR-011', barcode:'4000800000011', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Armoured Cable 4C 16mm (per m)', sku:'MC-EWR-012', barcode:'4000800000012', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Armoured Cable 4C 25mm (per m)', sku:'MC-EWR-013', barcode:'4000800000013', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Telephone Cable 2 Pair (per m)', sku:'MC-EWR-014', barcode:'4000800000014', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cat5e Network Cable (per m)', sku:'MC-EWR-015', barcode:'4000800000015', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cat6 Network Cable (per m)', sku:'MC-EWR-016', barcode:'4000800000016', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Coaxial Cable RG6 (per m)', sku:'MC-EWR-017', barcode:'4000800000017', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Earth Wire Green 2.5mm (per m)', sku:'MC-EWR-018', barcode:'4000800000018', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Flexible Wire 1.5mm Black (per m)', sku:'MC-EWR-019', barcode:'4000800000019', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Flexible Wire 2.5mm Black (per m)', sku:'MC-EWR-020', barcode:'4000800000020', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 9. CIRCUIT BREAKERS & PANELS (009-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'MCB 6A Single Pole', sku:'MC-MCB-001', barcode:'4000900000001', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 10A Single Pole', sku:'MC-MCB-002', barcode:'4000900000002', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 16A Single Pole', sku:'MC-MCB-003', barcode:'4000900000003', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 20A Single Pole', sku:'MC-MCB-004', barcode:'4000900000004', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 25A Single Pole', sku:'MC-MCB-005', barcode:'4000900000005', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 32A Single Pole', sku:'MC-MCB-006', barcode:'4000900000006', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 40A Single Pole', sku:'MC-MCB-007', barcode:'4000900000007', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 63A Single Pole', sku:'MC-MCB-008', barcode:'4000900000008', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 16A Double Pole', sku:'MC-MCB-009', barcode:'4000900000009', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 32A Double Pole', sku:'MC-MCB-010', barcode:'4000900000010', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MCB 63A Double Pole', sku:'MC-MCB-011', barcode:'4000900000011', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'ELCB 30mA 40A', sku:'MC-MCB-012', barcode:'4000900000012', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'ELCB 30mA 63A', sku:'MC-MCB-013', barcode:'4000900000013', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'RCCB 2P 25A 30mA', sku:'MC-MCB-014', barcode:'4000900000014', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fuse Box 4-Way', sku:'MC-MCB-015', barcode:'4000900000015', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fuse Box 8-Way', sku:'MC-MCB-016', barcode:'4000900000016', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fuse Box 12-Way', sku:'MC-MCB-017', barcode:'4000900000017', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Distribution Board 4-Way Flush', sku:'MC-MCB-018', barcode:'4000900000018', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Distribution Board 8-Way Flush', sku:'MC-MCB-019', barcode:'4000900000019', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Distribution Board 12-Way Flush', sku:'MC-MCB-020', barcode:'4000900000020', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fuse Element 6A (pack 10)', sku:'MC-MCB-021', barcode:'4000900000021', category:'Electrical', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Fuse Element 15A (pack 10)', sku:'MC-MCB-022', barcode:'4000900000022', category:'Electrical', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Fuse Element 30A (pack 10)', sku:'MC-MCB-023', barcode:'4000900000023', category:'Electrical', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },

  // ═══════════════════════════════════════════════════════════════════
  // 10. SWITCHES, SOCKETS & ACCESSORIES (010-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'1-Gang Switch 1-Way', sku:'MC-SWT-001', barcode:'4001000000001', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'1-Gang Switch 2-Way', sku:'MC-SWT-002', barcode:'4001000000002', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'2-Gang Switch 1-Way', sku:'MC-SWT-003', barcode:'4001000000003', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'3-Gang Switch 1-Way', sku:'MC-SWT-004', barcode:'4001000000004', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Intermediate Switch 1-Gang', sku:'MC-SWT-005', barcode:'4001000000005', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'3-Pin Socket 13A', sku:'MC-SWT-006', barcode:'4001000000006', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Switched 3-Pin Socket 13A', sku:'MC-SWT-007', barcode:'4001000000007', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'2-Gang Switched Socket 13A', sku:'MC-SWT-008', barcode:'4001000000008', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'5-Pin Socket 15A Round', sku:'MC-SWT-009', barcode:'4001000000009', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'TV Coaxial Socket', sku:'MC-SWT-010', barcode:'4001000000010', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Telephone Socket RJ11', sku:'MC-SWT-011', barcode:'4001000000011', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Data Socket Cat5e RJ45', sku:'MC-SWT-012', barcode:'4001000000012', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Data Socket Cat6 RJ45', sku:'MC-SWT-013', barcode:'4001000000013', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Dimmer Switch 1-Gang 500W', sku:'MC-SWT-014', barcode:'4001000000014', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fan Speed Regulator', sku:'MC-SWT-015', barcode:'4001000000015', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Bell Push Switch', sku:'MC-SWT-016', barcode:'4001000000016', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'1-Gang Blank Plate', sku:'MC-SWT-017', barcode:'4001000000017', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'2-Gang Blank Plate', sku:'MC-SWT-018', barcode:'4001000000018', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Surface Mount Box 1-Gang', sku:'MC-SWT-019', barcode:'4001000000019', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Surface Mount Box 2-Gang', sku:'MC-SWT-020', barcode:'4001000000020', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flush Box 1-Gang Metal', sku:'MC-SWT-021', barcode:'4001000000021', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flush Box 2-Gang Metal', sku:'MC-SWT-022', barcode:'4001000000022', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 11. CONDUIT & TRUNKING (011-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'PVC Conduit Pipe 20mm (per m)', sku:'MC-CDT-001', barcode:'4001100000001', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Conduit Pipe 25mm (per m)', sku:'MC-CDT-002', barcode:'4001100000002', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Conduit Pipe 32mm (per m)', sku:'MC-CDT-003', barcode:'4001100000003', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Conduit Pipe 50mm (per m)', sku:'MC-CDT-004', barcode:'4001100000004', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Flexible Conduit 20mm (per m)', sku:'MC-CDT-005', barcode:'4001100000005', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Conduit Elbow 90° 20mm', sku:'MC-CDT-006', barcode:'4001100000006', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Conduit Elbow 90° 25mm', sku:'MC-CDT-007', barcode:'4001100000007', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Conduit Tee 20mm', sku:'MC-CDT-008', barcode:'4001100000008', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Conduit Coupler 20mm', sku:'MC-CDT-009', barcode:'4001100000009', category:'Electrical', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Cable Trunking 40x25mm (per m)', sku:'MC-CDT-010', barcode:'4001100000010', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cable Trunking 60x40mm (per m)', sku:'MC-CDT-011', barcode:'4001100000011', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cable Trunking 100x50mm (per m)', sku:'MC-CDT-012', barcode:'4001100000012', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cable Tray 100mm (per m)', sku:'MC-CDT-013', barcode:'4001100000013', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cable Tray 200mm (per m)', sku:'MC-CDT-014', barcode:'4001100000014', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Cable Tie 100mm (pack 100)', sku:'MC-CDT-015', barcode:'4001100000015', category:'Electrical', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Cable Tie 200mm (pack 100)', sku:'MC-CDT-016', barcode:'4001100000016', category:'Electrical', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Cable Tie 300mm (pack 100)', sku:'MC-CDT-017', barcode:'4001100000017', category:'Electrical', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Wire Duct 25x25mm (per m)', sku:'MC-CDT-018', barcode:'4001100000018', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Spiral Wrap 6mm (per m)', sku:'MC-CDT-019', barcode:'4001100000019', category:'Electrical', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 12. LIGHTING (012-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'LED Bulb 5W E27 Cool White', sku:'MC-LGT-001', barcode:'4001200000001', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Bulb 9W E27 Cool White', sku:'MC-LGT-002', barcode:'4001200000002', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Bulb 12W E27 Cool White', sku:'MC-LGT-003', barcode:'4001200000003', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Bulb 15W E27 Cool White', sku:'MC-LGT-004', barcode:'4001200000004', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Bulb 18W E27 Cool White', sku:'MC-LGT-005', barcode:'4001200000005', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Bulb 9W E27 Warm White', sku:'MC-LGT-006', barcode:'4001200000006', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Tube Light T8 18W 4ft', sku:'MC-LGT-007', barcode:'4001200000007', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Tube Light T8 36W 5ft', sku:'MC-LGT-008', barcode:'4001200000008', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Downlight 6W Round', sku:'MC-LGT-009', barcode:'4001200000009', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Downlight 12W Round', sku:'MC-LGT-010', barcode:'4001200000010', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Flood Light 20W', sku:'MC-LGT-011', barcode:'4001200000011', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Flood Light 50W', sku:'MC-LGT-012', barcode:'4001200000012', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Flood Light 100W', sku:'MC-LGT-013', barcode:'4001200000013', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Street Light 30W', sku:'MC-LGT-014', barcode:'4001200000014', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'LED Street Light 60W', sku:'MC-LGT-015', barcode:'4001200000015', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'CFL Bulb 18W E27', sku:'MC-LGT-016', barcode:'4001200000016', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Ceiling Fan 48 inch 3-Blade', sku:'MC-LGT-017', barcode:'4001200000017', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Ceiling Fan 56 inch 3-Blade', sku:'MC-LGT-018', barcode:'4001200000018', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wall Fan 16 inch', sku:'MC-LGT-019', barcode:'4001200000019', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Exhaust Fan 6 inch', sku:'MC-LGT-020', barcode:'4001200000020', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Lamp Holder E27 Batten', sku:'MC-LGT-021', barcode:'4001200000021', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Surface Fitting 1-Lamp Fluorescent', sku:'MC-LGT-022', barcode:'4001200000022', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Surface Fitting 2-Lamp Fluorescent', sku:'MC-LGT-023', barcode:'4001200000023', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Emergency Light LED 6W', sku:'MC-LGT-024', barcode:'4001200000024', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Extension Cord 3-Way 5m', sku:'MC-LGT-025', barcode:'4001200000025', category:'Lighting', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 13. PAINT - INTERIOR (013-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Interior Emulsion Paint White 1L', sku:'MC-PNT-001', barcode:'4001300000001', category:'Paint', brand:null, unit:{name:'Liter',abbr:'L'}, sellType:'FIX', measurementUnit:'L' },
  { name:'Interior Emulsion Paint White 4L', sku:'MC-PNT-002', barcode:'4001300000002', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Interior Emulsion Paint White 20L', sku:'MC-PNT-003', barcode:'4001300000003', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Asian Paints Emulsion White 4L', sku:'MC-PNT-004', barcode:'4001300000004', category:'Paint', brand:'Asian Paints', unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Asian Paints Emulsion White 20L', sku:'MC-PNT-005', barcode:'4001300000005', category:'Paint', brand:'Asian Paints', unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Nippon Paint Mattex White 4L', sku:'MC-PNT-006', barcode:'4001300000006', category:'Paint', brand:'Nippon Paint', unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Nippon Paint Mattex White 20L', sku:'MC-PNT-007', barcode:'4001300000007', category:'Paint', brand:'Nippon Paint', unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Cement Paint White 1kg', sku:'MC-PNT-008', barcode:'4001300000008', category:'Paint', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Cement Paint White 5kg', sku:'MC-PNT-009', barcode:'4001300000009', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Cement Paint White 25kg', sku:'MC-PNT-010', barcode:'4001300000010', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Interior Primer White 4L', sku:'MC-PNT-011', barcode:'4001300000011', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Interior Primer White 20L', sku:'MC-PNT-012', barcode:'4001300000012', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Putty Wall White 5kg', sku:'MC-PNT-013', barcode:'4001300000013', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Putty Wall White 20kg', sku:'MC-PNT-014', barcode:'4001300000014', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Putty Wall White 40kg', sku:'MC-PNT-015', barcode:'4001300000015', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Texture Paint Sand Finish 20kg', sku:'MC-PNT-016', barcode:'4001300000016', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },

  // ═══════════════════════════════════════════════════════════════════
  // 14. PAINT - EXTERIOR (014-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Exterior Weathershield Paint 4L', sku:'MC-PEX-001', barcode:'4001400000001', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Exterior Weathershield Paint 20L', sku:'MC-PEX-002', barcode:'4001400000002', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Masonry Paint Smooth 4L', sku:'MC-PEX-003', barcode:'4001400000003', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Masonry Paint Textured 20kg', sku:'MC-PEX-004', barcode:'4001400000004', category:'Paint', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Bitumen Paint Black 4L', sku:'MC-PEX-005', barcode:'4001400000005', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Bitumen Paint Black 20L', sku:'MC-PEX-006', barcode:'4001400000006', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Roof Paint Terracotta 4L', sku:'MC-PEX-007', barcode:'4001400000007', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Anti-Fungal Paint 4L', sku:'MC-PEX-008', barcode:'4001400000008', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Floor Paint Grey 4L', sku:'MC-PEX-009', barcode:'4001400000009', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Floor Paint Grey 20L', sku:'MC-PEX-010', barcode:'4001400000010', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },

  // ═══════════════════════════════════════════════════════════════════
  // 15. PAINT SPECIALTY & SOLVENTS (015-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Enamel Paint White 1L', sku:'MC-PSP-001', barcode:'4001500000001', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Enamel Paint White 4L', sku:'MC-PSP-002', barcode:'4001500000002', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Gloss Paint Black 1L', sku:'MC-PSP-003', barcode:'4001500000003', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Gloss Paint Silver 1L', sku:'MC-PSP-004', barcode:'4001500000004', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Zinc Phosphate Primer 4L', sku:'MC-PSP-005', barcode:'4001500000005', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Red Oxide Primer 4L', sku:'MC-PSP-006', barcode:'4001500000006', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Paint Thinner Turpentine 1L', sku:'MC-PSP-007', barcode:'4001500000007', category:'Paint', brand:null, unit:{name:'Liter',abbr:'L'}, sellType:'loose', measurementUnit:'L' },
  { name:'Paint Thinner Turpentine 4L', sku:'MC-PSP-008', barcode:'4001500000008', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Lacquer Thinner 1L', sku:'MC-PSP-009', barcode:'4001500000009', category:'Paint', brand:null, unit:{name:'Liter',abbr:'L'}, sellType:'loose', measurementUnit:'L' },
  { name:'Varnish Wood Clear 1L', sku:'MC-PSP-010', barcode:'4001500000010', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Wood Stain Mahogany 1L', sku:'MC-PSP-011', barcode:'4001500000011', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Wood Stain Teak 1L', sku:'MC-PSP-012', barcode:'4001500000012', category:'Paint', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Spray Paint White 400ml', sku:'MC-PSP-013', barcode:'4001500000013', category:'Paint', brand:null, unit:{name:'Can',abbr:'can'}, sellType:'FIX', measurementUnit:'can' },
  { name:'Spray Paint Black 400ml', sku:'MC-PSP-014', barcode:'4001500000014', category:'Paint', brand:null, unit:{name:'Can',abbr:'can'}, sellType:'FIX', measurementUnit:'can' },
  { name:'Spray Paint Silver 400ml', sku:'MC-PSP-015', barcode:'4001500000015', category:'Paint', brand:null, unit:{name:'Can',abbr:'can'}, sellType:'FIX', measurementUnit:'can' },

  // ═══════════════════════════════════════════════════════════════════
  // 16. PAINT TOOLS & ACCESSORIES (016-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Paint Brush 1 inch', sku:'MC-PTL-001', barcode:'4001600000001', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Brush 2 inch', sku:'MC-PTL-002', barcode:'4001600000002', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Brush 3 inch', sku:'MC-PTL-003', barcode:'4001600000003', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Brush 4 inch', sku:'MC-PTL-004', barcode:'4001600000004', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Roller 4 inch', sku:'MC-PTL-005', barcode:'4001600000005', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Roller 7 inch', sku:'MC-PTL-006', barcode:'4001600000006', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Roller 9 inch', sku:'MC-PTL-007', barcode:'4001600000007', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Paint Roller 12 inch', sku:'MC-PTL-008', barcode:'4001600000008', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Roller Tray Plastic 9 inch', sku:'MC-PTL-009', barcode:'4001600000009', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Roller Extension Pole 1.5m', sku:'MC-PTL-010', barcode:'4001600000010', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Masking Tape 1 inch 50m', sku:'MC-PTL-011', barcode:'4001600000011', category:'Paint Tools', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'Masking Tape 2 inch 50m', sku:'MC-PTL-012', barcode:'4001600000012', category:'Paint Tools', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'Drop Cloth Plastic 4x5m', sku:'MC-PTL-013', barcode:'4001600000013', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Putty Knife 3 inch', sku:'MC-PTL-014', barcode:'4001600000014', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Putty Knife 5 inch', sku:'MC-PTL-015', barcode:'4001600000015', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sandpaper Sheet P80 (pack 10)', sku:'MC-PTL-016', barcode:'4001600000016', category:'Paint Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Sandpaper Sheet P120 (pack 10)', sku:'MC-PTL-017', barcode:'4001600000017', category:'Paint Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Sandpaper Sheet P180 (pack 10)', sku:'MC-PTL-018', barcode:'4001600000018', category:'Paint Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Sandpaper Sheet P240 (pack 10)', sku:'MC-PTL-019', barcode:'4001600000019', category:'Paint Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Wire Brush Steel 4 inch', sku:'MC-PTL-020', barcode:'4001600000020', category:'Paint Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 17. HAND TOOLS (017-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Claw Hammer 16oz', sku:'MC-HTL-001', barcode:'4001700000001', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Claw Hammer 20oz', sku:'MC-HTL-002', barcode:'4001700000002', category:'Hand Tools', brand:'Stanley', unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Ball Pein Hammer 1.5lb', sku:'MC-HTL-003', barcode:'4001700000003', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Ball Pein Hammer 2lb', sku:'MC-HTL-004', barcode:'4001700000004', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sledgehammer 3lb', sku:'MC-HTL-005', barcode:'4001700000005', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sledgehammer 5lb', sku:'MC-HTL-006', barcode:'4001700000006', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sledgehammer 10lb', sku:'MC-HTL-007', barcode:'4001700000007', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Rubber Mallet 500g', sku:'MC-HTL-008', barcode:'4001700000008', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hacksaw Frame Adjustable', sku:'MC-HTL-009', barcode:'4001700000009', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hacksaw Blade 12 inch (pack 5)', sku:'MC-HTL-010', barcode:'4001700000010', category:'Hand Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Hand Saw 22 inch', sku:'MC-HTL-011', barcode:'4001700000011', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tenon Saw 12 inch', sku:'MC-HTL-012', barcode:'4001700000012', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flat Screwdriver 6 inch', sku:'MC-HTL-013', barcode:'4001700000013', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flat Screwdriver 8 inch', sku:'MC-HTL-014', barcode:'4001700000014', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Phillips Screwdriver PH1', sku:'MC-HTL-015', barcode:'4001700000015', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Phillips Screwdriver PH2', sku:'MC-HTL-016', barcode:'4001700000016', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Screwdriver Set 6-Piece', sku:'MC-HTL-017', barcode:'4001700000017', category:'Hand Tools', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Adjustable Wrench 8 inch', sku:'MC-HTL-018', barcode:'4001700000018', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Adjustable Wrench 10 inch', sku:'MC-HTL-019', barcode:'4001700000019', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Adjustable Wrench 12 inch', sku:'MC-HTL-020', barcode:'4001700000020', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Combination Spanner Set 8-22mm', sku:'MC-HTL-021', barcode:'4001700000021', category:'Hand Tools', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Pipe Wrench 14 inch', sku:'MC-HTL-022', barcode:'4001700000022', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pipe Wrench 18 inch', sku:'MC-HTL-023', barcode:'4001700000023', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Nose Pliers 6 inch', sku:'MC-HTL-024', barcode:'4001700000024', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Combination Pliers 8 inch', sku:'MC-HTL-025', barcode:'4001700000025', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Cutting Pliers 7 inch', sku:'MC-HTL-026', barcode:'4001700000026', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wire Stripper & Cutter', sku:'MC-HTL-027', barcode:'4001700000027', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Crimping Tool RJ45', sku:'MC-HTL-028', barcode:'4001700000028', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Spirit Level 24 inch', sku:'MC-HTL-029', barcode:'4001700000029', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Spirit Level 48 inch', sku:'MC-HTL-030', barcode:'4001700000030', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tape Measure 3m', sku:'MC-HTL-031', barcode:'4001700000031', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tape Measure 5m', sku:'MC-HTL-032', barcode:'4001700000032', category:'Hand Tools', brand:'Stanley', unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tape Measure 7.5m', sku:'MC-HTL-033', barcode:'4001700000033', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tape Measure 10m', sku:'MC-HTL-034', barcode:'4001700000034', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Steel Square 300mm', sku:'MC-HTL-035', barcode:'4001700000035', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Try Square 6 inch', sku:'MC-HTL-036', barcode:'4001700000036', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Chalk Line Reel', sku:'MC-HTL-037', barcode:'4001700000037', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Utility Knife with Blades', sku:'MC-HTL-038', barcode:'4001700000038', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Box Cutter Snap-Off Blade', sku:'MC-HTL-039', barcode:'4001700000039', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Trowel Plastering 12 inch', sku:'MC-HTL-040', barcode:'4001700000040', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Trowel Brick 10 inch', sku:'MC-HTL-041', barcode:'4001700000041', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Trowel Pointing 6 inch', sku:'MC-HTL-042', barcode:'4001700000042', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Float Sponge Tile', sku:'MC-HTL-043', barcode:'4001700000043', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Notched Trowel Square 10mm', sku:'MC-HTL-044', barcode:'4001700000044', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tile Cutter Manual 60cm', sku:'MC-HTL-045', barcode:'4001700000045', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Chisel Cold 1/2 inch', sku:'MC-HTL-046', barcode:'4001700000046', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Chisel Cold 3/4 inch', sku:'MC-HTL-047', barcode:'4001700000047', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wood Chisel 1 inch', sku:'MC-HTL-048', barcode:'4001700000048', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Punch Pin Set 3-Piece', sku:'MC-HTL-049', barcode:'4001700000049', category:'Hand Tools', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Pry Bar 12 inch', sku:'MC-HTL-050', barcode:'4001700000050', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pry Bar 24 inch', sku:'MC-HTL-051', barcode:'4001700000051', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Brick Jointer 1/2 inch', sku:'MC-HTL-052', barcode:'4001700000052', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Digging Spade', sku:'MC-HTL-053', barcode:'4001700000053', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Garden Fork', sku:'MC-HTL-054', barcode:'4001700000054', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Mattock Hoe', sku:'MC-HTL-055', barcode:'4001700000055', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pickaxe 5lb', sku:'MC-HTL-056', barcode:'4001700000056', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wheelbarrow Steel 100L', sku:'MC-HTL-057', barcode:'4001700000057', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tool Bag Canvas 14 inch', sku:'MC-HTL-058', barcode:'4001700000058', category:'Hand Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hex Key Set Metric 9-Piece', sku:'MC-HTL-059', barcode:'4001700000059', category:'Hand Tools', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Hex Key Set Imperial 9-Piece', sku:'MC-HTL-060', barcode:'4001700000060', category:'Hand Tools', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },

  // ═══════════════════════════════════════════════════════════════════
  // 18. POWER TOOLS (018-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Rotary Drill 550W', sku:'MC-PWR-001', barcode:'4001800000001', category:'Power Tools', brand:'Bosch', unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Rotary Drill 850W', sku:'MC-PWR-002', barcode:'4001800000002', category:'Power Tools', brand:'Bosch', unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hammer Drill 900W', sku:'MC-PWR-003', barcode:'4001800000003', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'SDS Rotary Hammer 1050W', sku:'MC-PWR-004', barcode:'4001800000004', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Demolition Hammer 1500W', sku:'MC-PWR-005', barcode:'4001800000005', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Angle Grinder 4 inch 700W', sku:'MC-PWR-006', barcode:'4001800000006', category:'Power Tools', brand:'Makita', unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Angle Grinder 5 inch 900W', sku:'MC-PWR-007', barcode:'4001800000007', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Angle Grinder 7 inch 2200W', sku:'MC-PWR-008', barcode:'4001800000008', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Circular Saw 7.25 inch 1200W', sku:'MC-PWR-009', barcode:'4001800000009', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Jigsaw 500W Variable Speed', sku:'MC-PWR-010', barcode:'4001800000010', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Reciprocating Saw 900W', sku:'MC-PWR-011', barcode:'4001800000011', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Random Orbital Sander 220W', sku:'MC-PWR-012', barcode:'4001800000012', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Belt Sander 650W', sku:'MC-PWR-013', barcode:'4001800000013', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Router 1600W', sku:'MC-PWR-014', barcode:'4001800000014', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Impact Driver 18V Cordless', sku:'MC-PWR-015', barcode:'4001800000015', category:'Power Tools', brand:'Makita', unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Cordless Drill 18V', sku:'MC-PWR-016', barcode:'4001800000016', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Cordless Angle Grinder 18V', sku:'MC-PWR-017', barcode:'4001800000017', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Electric Planer 750W', sku:'MC-PWR-018', barcode:'4001800000018', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Drill Bit Set HSS 13-Piece', sku:'MC-PWR-019', barcode:'4001800000019', category:'Power Tools', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Masonry Drill Bit 6mm', sku:'MC-PWR-020', barcode:'4001800000020', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Masonry Drill Bit 8mm', sku:'MC-PWR-021', barcode:'4001800000021', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Masonry Drill Bit 10mm', sku:'MC-PWR-022', barcode:'4001800000022', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Masonry Drill Bit 12mm', sku:'MC-PWR-023', barcode:'4001800000023', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Cutting Disc 4 inch (pack 25)', sku:'MC-PWR-024', barcode:'4001800000024', category:'Power Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Grinding Disc 4 inch (pack 5)', sku:'MC-PWR-025', barcode:'4001800000025', category:'Power Tools', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Diamond Disc 4 inch Dry', sku:'MC-PWR-026', barcode:'4001800000026', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Diamond Disc 7 inch Dry', sku:'MC-PWR-027', barcode:'4001800000027', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'SDS Bit 6x160mm', sku:'MC-PWR-028', barcode:'4001800000028', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'SDS Bit 8x160mm', sku:'MC-PWR-029', barcode:'4001800000029', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'SDS Bit 10x160mm', sku:'MC-PWR-030', barcode:'4001800000030', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Extension Cord 15m 3-Core', sku:'MC-PWR-031', barcode:'4001800000031', category:'Power Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 19. ROOFING (019-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Galvanized Corrugated Sheet 0.4mm 6ft', sku:'MC-ROF-001', barcode:'4001900000001', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Galvanized Corrugated Sheet 0.4mm 8ft', sku:'MC-ROF-002', barcode:'4001900000002', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Galvanized Corrugated Sheet 0.4mm 10ft', sku:'MC-ROF-003', barcode:'4001900000003', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Galvanized Corrugated Sheet 0.5mm 8ft', sku:'MC-ROF-004', barcode:'4001900000004', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Galvanized Corrugated Sheet 0.6mm 8ft', sku:'MC-ROF-005', barcode:'4001900000005', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Colorcoat Roofing Sheet 0.45mm 8ft', sku:'MC-ROF-006', barcode:'4001900000006', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Colorcoat Roofing Sheet 0.45mm 10ft', sku:'MC-ROF-007', barcode:'4001900000007', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'UPVC Roofing Sheet Transparent 8ft', sku:'MC-ROF-008', barcode:'4001900000008', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Fibre Cement Sheet 6mm 4x8ft', sku:'MC-ROF-009', barcode:'4001900000009', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Fibre Cement Sheet 9mm 4x8ft', sku:'MC-ROF-010', barcode:'4001900000010', category:'Roofing', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Clay Roof Tile Classic', sku:'MC-ROF-011', barcode:'4001900000011', category:'Roofing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Clay Ridge Tile', sku:'MC-ROF-012', barcode:'4001900000012', category:'Roofing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Roofing Screws Galv 50mm (pack 250)', sku:'MC-ROF-013', barcode:'4001900000013', category:'Roofing', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Roofing Nails Galv 2 inch (per kg)', sku:'MC-ROF-014', barcode:'4001900000014', category:'Roofing', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Roof Purlin Z Section 50x50mm (per m)', sku:'MC-ROF-015', barcode:'4001900000015', category:'Roofing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Ridge Cap Galv 0.4mm 8ft', sku:'MC-ROF-016', barcode:'4001900000016', category:'Roofing', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Roof Insulation Blanket (per m)', sku:'MC-ROF-017', barcode:'4001900000017', category:'Roofing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Bitumen Felt Underlay (per m)', sku:'MC-ROF-018', barcode:'4001900000018', category:'Roofing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 20. TILES & FLOORING (020-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Ceramic Floor Tile 30x30cm Ivory', sku:'MC-TIL-001', barcode:'4002000000001', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Ceramic Floor Tile 40x40cm Ivory', sku:'MC-TIL-002', barcode:'4002000000002', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Ceramic Floor Tile 60x60cm White', sku:'MC-TIL-003', barcode:'4002000000003', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Ceramic Wall Tile 20x30cm White', sku:'MC-TIL-004', barcode:'4002000000004', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Ceramic Wall Tile 25x40cm White', sku:'MC-TIL-005', barcode:'4002000000005', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Porcelain Floor Tile 60x60cm Matt', sku:'MC-TIL-006', barcode:'4002000000006', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Porcelain Floor Tile 80x80cm Gloss', sku:'MC-TIL-007', barcode:'4002000000007', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Porcelain Wall Tile 30x60cm', sku:'MC-TIL-008', barcode:'4002000000008', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Anti-Slip Floor Tile 30x30cm', sku:'MC-TIL-009', barcode:'4002000000009', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Granite Tile 60x60cm Polished', sku:'MC-TIL-010', barcode:'4002000000010', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Mosaic Tile 30x30cm White', sku:'MC-TIL-011', barcode:'4002000000011', category:'Tiles & Flooring', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Tile Spacer 2mm (bag 500)', sku:'MC-TIL-012', barcode:'4002000000012', category:'Tiles & Flooring', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Tile Spacer 3mm (bag 500)', sku:'MC-TIL-013', barcode:'4002000000013', category:'Tiles & Flooring', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Tile Adhesive Grey 20kg', sku:'MC-TIL-014', barcode:'4002000000014', category:'Tiles & Flooring', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Tile Adhesive White 20kg', sku:'MC-TIL-015', barcode:'4002000000015', category:'Tiles & Flooring', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Tile Grout White 2kg', sku:'MC-TIL-016', barcode:'4002000000016', category:'Tiles & Flooring', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Tile Grout Grey 2kg', sku:'MC-TIL-017', barcode:'4002000000017', category:'Tiles & Flooring', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Tile Grout Cream 2kg', sku:'MC-TIL-018', barcode:'4002000000018', category:'Tiles & Flooring', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Vinyl Floor Tile 30x30cm (box)', sku:'MC-TIL-019', barcode:'4002000000019', category:'Tiles & Flooring', brand:null, unit:{name:'Box',abbr:'box'}, sellType:'FIX', measurementUnit:'box' },
  { name:'Laminate Flooring 8mm (per m²)', sku:'MC-TIL-020', barcode:'4002000000020', category:'Tiles & Flooring', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },

  // ═══════════════════════════════════════════════════════════════════
  // 21. LUMBER & WOOD (021-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Timber Beam 2x2 inch (per m)', sku:'MC-WOD-001', barcode:'4002100000001', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Timber Beam 2x4 inch (per m)', sku:'MC-WOD-002', barcode:'4002100000002', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Timber Beam 3x4 inch (per m)', sku:'MC-WOD-003', barcode:'4002100000003', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Timber Beam 4x4 inch (per m)', sku:'MC-WOD-004', barcode:'4002100000004', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Timber Beam 4x6 inch (per m)', sku:'MC-WOD-005', barcode:'4002100000005', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Timber Plank 1x6 inch (per m)', sku:'MC-WOD-006', barcode:'4002100000006', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Timber Plank 1x8 inch (per m)', sku:'MC-WOD-007', barcode:'4002100000007', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Plywood Sheet 4mm 4x8ft', sku:'MC-WOD-008', barcode:'4002100000008', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Plywood Sheet 6mm 4x8ft', sku:'MC-WOD-009', barcode:'4002100000009', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Plywood Sheet 9mm 4x8ft', sku:'MC-WOD-010', barcode:'4002100000010', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Plywood Sheet 12mm 4x8ft', sku:'MC-WOD-011', barcode:'4002100000011', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Plywood Sheet 18mm 4x8ft', sku:'MC-WOD-012', barcode:'4002100000012', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'MDF Board 6mm 4x8ft', sku:'MC-WOD-013', barcode:'4002100000013', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'MDF Board 9mm 4x8ft', sku:'MC-WOD-014', barcode:'4002100000014', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'MDF Board 12mm 4x8ft', sku:'MC-WOD-015', barcode:'4002100000015', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'MDF Board 18mm 4x8ft', sku:'MC-WOD-016', barcode:'4002100000016', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Particle Board 18mm 4x8ft', sku:'MC-WOD-017', barcode:'4002100000017', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Chipboard 18mm 4x8ft', sku:'MC-WOD-018', barcode:'4002100000018', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Marine Plywood 12mm 4x8ft', sku:'MC-WOD-019', barcode:'4002100000019', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Fibre Board 3.5mm 4x8ft', sku:'MC-WOD-020', barcode:'4002100000020', category:'Lumber & Wood', brand:null, unit:{name:'Sheet',abbr:'sheet'}, sellType:'FIX', measurementUnit:'sheet' },
  { name:'Hardwood Dowel 6mm (per m)', sku:'MC-WOD-021', barcode:'4002100000021', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Hardwood Dowel 10mm (per m)', sku:'MC-WOD-022', barcode:'4002100000022', category:'Lumber & Wood', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 22. FASTENERS - NAILS (022-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Common Nails 1 inch (per kg)', sku:'MC-NAL-001', barcode:'4002200000001', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Common Nails 1.5 inch (per kg)', sku:'MC-NAL-002', barcode:'4002200000002', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Common Nails 2 inch (per kg)', sku:'MC-NAL-003', barcode:'4002200000003', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Common Nails 3 inch (per kg)', sku:'MC-NAL-004', barcode:'4002200000004', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Common Nails 4 inch (per kg)', sku:'MC-NAL-005', barcode:'4002200000005', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Roofing Clout Nails 1.5 inch (per kg)', sku:'MC-NAL-006', barcode:'4002200000006', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Galvanised Nails 2 inch (per kg)', sku:'MC-NAL-007', barcode:'4002200000007', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Galvanised Nails 3 inch (per kg)', sku:'MC-NAL-008', barcode:'4002200000008', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Finishing Nails 1.5 inch (per kg)', sku:'MC-NAL-009', barcode:'4002200000009', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Brad Nails 1 inch (pack 1000)', sku:'MC-NAL-010', barcode:'4002200000010', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Wire Staples U-Type (per kg)', sku:'MC-NAL-011', barcode:'4002200000011', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hardboard Nails 1 inch (per kg)', sku:'MC-NAL-012', barcode:'4002200000012', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },

  // ═══════════════════════════════════════════════════════════════════
  // 23. FASTENERS - BOLTS & NUTS (023-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Hex Bolt M6x25mm (per kg)', sku:'MC-BLT-001', barcode:'4002300000001', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M6x50mm (per kg)', sku:'MC-BLT-002', barcode:'4002300000002', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M8x25mm (per kg)', sku:'MC-BLT-003', barcode:'4002300000003', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M8x50mm (per kg)', sku:'MC-BLT-004', barcode:'4002300000004', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M10x50mm (per kg)', sku:'MC-BLT-005', barcode:'4002300000005', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M10x75mm (per kg)', sku:'MC-BLT-006', barcode:'4002300000006', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M12x50mm (per kg)', sku:'MC-BLT-007', barcode:'4002300000007', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Bolt M12x100mm (per kg)', sku:'MC-BLT-008', barcode:'4002300000008', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Nut M6 (per kg)', sku:'MC-BLT-009', barcode:'4002300000009', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Nut M8 (per kg)', sku:'MC-BLT-010', barcode:'4002300000010', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Nut M10 (per kg)', sku:'MC-BLT-011', barcode:'4002300000011', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Hex Nut M12 (per kg)', sku:'MC-BLT-012', barcode:'4002300000012', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Flat Washer M6 (per kg)', sku:'MC-BLT-013', barcode:'4002300000013', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Flat Washer M8 (per kg)', sku:'MC-BLT-014', barcode:'4002300000014', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Flat Washer M10 (per kg)', sku:'MC-BLT-015', barcode:'4002300000015', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Spring Washer M6 (per kg)', sku:'MC-BLT-016', barcode:'4002300000016', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Spring Washer M8 (per kg)', sku:'MC-BLT-017', barcode:'4002300000017', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'J-Bolt M8x150mm (each)', sku:'MC-BLT-018', barcode:'4002300000018', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'J-Bolt M10x200mm (each)', sku:'MC-BLT-019', barcode:'4002300000019', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'U-Bolt 25mm Pipe (each)', sku:'MC-BLT-020', barcode:'4002300000020', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Coach Screw M8x75mm (per kg)', sku:'MC-BLT-021', barcode:'4002300000021', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Threaded Rod M8 1m', sku:'MC-BLT-022', barcode:'4002300000022', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Threaded Rod M10 1m', sku:'MC-BLT-023', barcode:'4002300000023', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Threaded Rod M12 1m', sku:'MC-BLT-024', barcode:'4002300000024', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 24. FASTENERS - SCREWS (024-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Wood Screw 1 inch PH2 (per kg)', sku:'MC-SCR-001', barcode:'4002400000001', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Wood Screw 1.5 inch PH2 (per kg)', sku:'MC-SCR-002', barcode:'4002400000002', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Wood Screw 2 inch PH2 (per kg)', sku:'MC-SCR-003', barcode:'4002400000003', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Wood Screw 3 inch PH2 (per kg)', sku:'MC-SCR-004', barcode:'4002400000004', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Drywall Screw 1 inch (per kg)', sku:'MC-SCR-005', barcode:'4002400000005', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Drywall Screw 1.5 inch (per kg)', sku:'MC-SCR-006', barcode:'4002400000006', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Self Tapping Screw M4x16 (per kg)', sku:'MC-SCR-007', barcode:'4002400000007', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Self Tapping Screw M4x25 (per kg)', sku:'MC-SCR-008', barcode:'4002400000008', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Self Drilling Screw 10x1 inch (per kg)', sku:'MC-SCR-009', barcode:'4002400000009', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Machine Screw M5x20 PH (per kg)', sku:'MC-SCR-010', barcode:'4002400000010', category:'Fasteners', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Concrete Anchor M6x40 (pack 50)', sku:'MC-SCR-011', barcode:'4002400000011', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Concrete Anchor M8x60 (pack 25)', sku:'MC-SCR-012', barcode:'4002400000012', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Concrete Anchor M10x75 (pack 25)', sku:'MC-SCR-013', barcode:'4002400000013', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Plastic Wall Plug 6mm (pack 100)', sku:'MC-SCR-014', barcode:'4002400000014', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Plastic Wall Plug 8mm (pack 100)', sku:'MC-SCR-015', barcode:'4002400000015', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Plastic Wall Plug 10mm (pack 100)', sku:'MC-SCR-016', barcode:'4002400000016', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Chemical Anchor 300ml Cartridge', sku:'MC-SCR-017', barcode:'4002400000017', category:'Fasteners', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Nylon Expansion Bolt M6x50 (pack 10)', sku:'MC-SCR-018', barcode:'4002400000018', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Nylon Expansion Bolt M8x50 (pack 10)', sku:'MC-SCR-019', barcode:'4002400000019', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Nylon Expansion Bolt M10x75 (pack 10)', sku:'MC-SCR-020', barcode:'4002400000020', category:'Fasteners', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },

  // ═══════════════════════════════════════════════════════════════════
  // 25. DOORS & WINDOWS (025-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Solid Wood Door 6-Panel 2.1x0.9m', sku:'MC-DOR-001', barcode:'4002500000001', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hollow Core Door Flush 2.1x0.9m', sku:'MC-DOR-002', barcode:'4002500000002', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fibre Glass Door 2.1x0.9m', sku:'MC-DOR-003', barcode:'4002500000003', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVC Door 2.1x0.9m', sku:'MC-DOR-004', barcode:'4002500000004', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Steel Security Door 2.1x0.9m', sku:'MC-DOR-005', barcode:'4002500000005', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Sliding Door 2.1x1.8m', sku:'MC-DOR-006', barcode:'4002500000006', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Casement Window 1.2x0.9m', sku:'MC-DOR-007', barcode:'4002500000007', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Sliding Window 1.2x0.9m', sku:'MC-DOR-008', barcode:'4002500000008', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Fixed Window 1.2x0.6m', sku:'MC-DOR-009', barcode:'4002500000009', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'UPVC Window Casement 1.2x0.9m', sku:'MC-DOR-010', barcode:'4002500000010', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Window Louvre Blade 450mm (pack 6)', sku:'MC-DOR-011', barcode:'4002500000011', category:'Doors & Windows', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Door Frame Wood 2.1x0.9m', sku:'MC-DOR-012', barcode:'4002500000012', category:'Doors & Windows', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Window Burglar Guard 1.2x0.9m', sku:'MC-DOR-013', barcode:'4002500000013', category:'Doors & Windows', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Mosquito Net Roll 1.2m (per m)', sku:'MC-DOR-014', barcode:'4002500000014', category:'Doors & Windows', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 26. DOOR HARDWARE & LOCKS (026-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Door Hinge Butt 3 inch SS (pair)', sku:'MC-DRH-001', barcode:'4002600000001', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Door Hinge Butt 4 inch SS (pair)', sku:'MC-DRH-002', barcode:'4002600000002', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Door Hinge Spring Self-Closing 3 inch', sku:'MC-DRH-003', barcode:'4002600000003', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Door Mortise Lock Set', sku:'MC-DRH-004', barcode:'4002600000004', category:'Hardware', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Door Latch Bolt 4 inch SS', sku:'MC-DRH-005', barcode:'4002600000005', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Door Knob Set Privacy', sku:'MC-DRH-006', barcode:'4002600000006', category:'Hardware', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Door Lever Handle Set SS', sku:'MC-DRH-007', barcode:'4002600000007', category:'Hardware', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Door Stopper Floor Mounted', sku:'MC-DRH-008', barcode:'4002600000008', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Door Closer Heavy Duty', sku:'MC-DRH-009', barcode:'4002600000009', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Padlock Brass 40mm', sku:'MC-DRH-010', barcode:'4002600000010', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Padlock Brass 50mm', sku:'MC-DRH-011', barcode:'4002600000011', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Padlock Steel 60mm', sku:'MC-DRH-012', barcode:'4002600000012', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Deadbolt Lock Single Cylinder', sku:'MC-DRH-013', barcode:'4002600000013', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Barrel Bolt 4 inch SS', sku:'MC-DRH-014', barcode:'4002600000014', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tower Bolt 6 inch SS', sku:'MC-DRH-015', barcode:'4002600000015', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tower Bolt 8 inch SS', sku:'MC-DRH-016', barcode:'4002600000016', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hasp & Staple 3 inch', sku:'MC-DRH-017', barcode:'4002600000017', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Door Chain Guard SS', sku:'MC-DRH-018', barcode:'4002600000018', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Gate Hook & Eye 4 inch (pair)', sku:'MC-DRH-019', barcode:'4002600000019', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Cabinet Hinge 35mm Concealed (pair)', sku:'MC-DRH-020', barcode:'4002600000020', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },

  // ═══════════════════════════════════════════════════════════════════
  // 27. WATERPROOFING & DAMP PROOFING (027-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Waterproofing Compound 1kg', sku:'MC-WPF-001', barcode:'4002700000001', category:'Waterproofing', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Waterproofing Compound 5kg', sku:'MC-WPF-002', barcode:'4002700000002', category:'Waterproofing', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Waterproofing Compound 20kg', sku:'MC-WPF-003', barcode:'4002700000003', category:'Waterproofing', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },
  { name:'Liquid Membrane Waterproofing 4L', sku:'MC-WPF-004', barcode:'4002700000004', category:'Waterproofing', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Liquid Membrane Waterproofing 20L', sku:'MC-WPF-005', barcode:'4002700000005', category:'Waterproofing', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Bitumen Emulsion 4L', sku:'MC-WPF-006', barcode:'4002700000006', category:'Waterproofing', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Bitumen Emulsion 20L', sku:'MC-WPF-007', barcode:'4002700000007', category:'Waterproofing', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'SBR Polymer Waterproofing 5L', sku:'MC-WPF-008', barcode:'4002700000008', category:'Waterproofing', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Damp Proof Course Sheet (per m)', sku:'MC-WPF-009', barcode:'4002700000009', category:'Waterproofing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Waterproof Tape 50mm (per m)', sku:'MC-WPF-010', barcode:'4002700000010', category:'Waterproofing', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Basement Waterproofing Crystalline 5kg', sku:'MC-WPF-011', barcode:'4002700000011', category:'Waterproofing', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },

  // ═══════════════════════════════════════════════════════════════════
  // 28. ADHESIVES & SEALANTS (028-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Silicone Sealant Clear 300ml', sku:'MC-ADH-001', barcode:'4002800000001', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Silicone Sealant White 300ml', sku:'MC-ADH-002', barcode:'4002800000002', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Silicone Sealant Black 300ml', sku:'MC-ADH-003', barcode:'4002800000003', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Silicone Sealant Sanitary 300ml', sku:'MC-ADH-004', barcode:'4002800000004', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Polyurethane Sealant Grey 600ml', sku:'MC-ADH-005', barcode:'4002800000005', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Epoxy Putty Steel 100g', sku:'MC-ADH-006', barcode:'4002800000006', category:'Adhesives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Epoxy Adhesive 2-Part 50ml', sku:'MC-ADH-007', barcode:'4002800000007', category:'Adhesives', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'Contact Adhesive 500ml', sku:'MC-ADH-008', barcode:'4002800000008', category:'Adhesives', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Contact Adhesive 4L', sku:'MC-ADH-009', barcode:'4002800000009', category:'Adhesives', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'PVA Wood Glue 500ml', sku:'MC-ADH-010', barcode:'4002800000010', category:'Adhesives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'PVA Wood Glue 5L', sku:'MC-ADH-011', barcode:'4002800000011', category:'Adhesives', brand:null, unit:{name:'Tin',abbr:'tin'}, sellType:'FIX', measurementUnit:'tin' },
  { name:'Super Glue Cyanoacrylate 3g', sku:'MC-ADH-012', barcode:'4002800000012', category:'Adhesives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Expanding Foam Sealant 500ml', sku:'MC-ADH-013', barcode:'4002800000013', category:'Adhesives', brand:null, unit:{name:'Can',abbr:'can'}, sellType:'FIX', measurementUnit:'can' },
  { name:'Acrylic Sealant White 300ml', sku:'MC-ADH-014', barcode:'4002800000014', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Gasket Maker Grey 100ml', sku:'MC-ADH-015', barcode:'4002800000015', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },
  { name:'Duct Tape 50mm x 25m Silver', sku:'MC-ADH-016', barcode:'4002800000016', category:'Adhesives', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'Double Sided Tape 25mm x 5m', sku:'MC-ADH-017', barcode:'4002800000017', category:'Adhesives', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'Sellotape Clear 24mm x 50m', sku:'MC-ADH-018', barcode:'4002800000018', category:'Adhesives', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'Foam Tape 10x10mm (per m)', sku:'MC-ADH-019', barcode:'4002800000019', category:'Adhesives', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Construction Adhesive 300ml', sku:'MC-ADH-020', barcode:'4002800000020', category:'Adhesives', brand:null, unit:{name:'Tube',abbr:'tube'}, sellType:'FIX', measurementUnit:'tube' },

  // ═══════════════════════════════════════════════════════════════════
  // 29. SAFETY EQUIPMENT (029-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Safety Helmet HDPE White', sku:'MC-SAF-001', barcode:'4002900000001', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Helmet HDPE Yellow', sku:'MC-SAF-002', barcode:'4002900000002', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Helmet HDPE Orange', sku:'MC-SAF-003', barcode:'4002900000003', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Goggles Clear Lens', sku:'MC-SAF-004', barcode:'4002900000004', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Goggles Tinted', sku:'MC-SAF-005', barcode:'4002900000005', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Welding Mask Auto Darkening', sku:'MC-SAF-006', barcode:'4002900000006', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Welding Mask Fixed Lens #10', sku:'MC-SAF-007', barcode:'4002900000007', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Dust Mask N95 (box 20)', sku:'MC-SAF-008', barcode:'4002900000008', category:'Safety', brand:null, unit:{name:'Box',abbr:'box'}, sellType:'FIX', measurementUnit:'box' },
  { name:'Half Face Respirator Mask', sku:'MC-SAF-009', barcode:'4002900000009', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Respirator Cartridge A1P2 (pair)', sku:'MC-SAF-010', barcode:'4002900000010', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Work Gloves Cotton L', sku:'MC-SAF-011', barcode:'4002900000011', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Work Gloves Leather Welding', sku:'MC-SAF-012', barcode:'4002900000012', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Work Gloves Cut Resistant L', sku:'MC-SAF-013', barcode:'4002900000013', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Safety Boots Steel Toe Size 40', sku:'MC-SAF-014', barcode:'4002900000014', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Safety Boots Steel Toe Size 42', sku:'MC-SAF-015', barcode:'4002900000015', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Safety Boots Steel Toe Size 44', sku:'MC-SAF-016', barcode:'4002900000016', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'High Visibility Vest Orange L', sku:'MC-SAF-017', barcode:'4002900000017', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'High Visibility Vest Yellow XL', sku:'MC-SAF-018', barcode:'4002900000018', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Harness Full Body', sku:'MC-SAF-019', barcode:'4002900000019', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Rope Lifeline 15m', sku:'MC-SAF-020', barcode:'4002900000020', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Ear Muffs Noise Reduction', sku:'MC-SAF-021', barcode:'4002900000021', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Ear Plugs Foam (box 100 pairs)', sku:'MC-SAF-022', barcode:'4002900000022', category:'Safety', brand:null, unit:{name:'Box',abbr:'box'}, sellType:'FIX', measurementUnit:'box' },
  { name:'First Aid Kit Small 25-Piece', sku:'MC-SAF-023', barcode:'4002900000023', category:'Safety', brand:null, unit:{name:'Kit',abbr:'kit'}, sellType:'FIX', measurementUnit:'kit' },
  { name:'Fire Extinguisher 1kg CO2', sku:'MC-SAF-024', barcode:'4002900000024', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fire Extinguisher 2kg ABC', sku:'MC-SAF-025', barcode:'4002900000025', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Safety Sign Danger (pack 5)', sku:'MC-SAF-026', barcode:'4002900000026', category:'Safety', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Knee Pads Professional', sku:'MC-SAF-027', barcode:'4002900000027', category:'Safety', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Face Shield Visor Clear', sku:'MC-SAF-028', barcode:'4002900000028', category:'Safety', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 30. LADDERS & SCAFFOLDING (030-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Aluminium Step Ladder 3-Step', sku:'MC-LAD-001', barcode:'4003000000001', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Step Ladder 5-Step', sku:'MC-LAD-002', barcode:'4003000000002', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Step Ladder 6-Step', sku:'MC-LAD-003', barcode:'4003000000003', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Step Ladder 8-Step', sku:'MC-LAD-004', barcode:'4003000000004', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Extension Ladder 16ft', sku:'MC-LAD-005', barcode:'4003000000005', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Aluminium Extension Ladder 24ft', sku:'MC-LAD-006', barcode:'4003000000006', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fibreglass Ladder 6-Step', sku:'MC-LAD-007', barcode:'4003000000007', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Bamboo Ladder 8ft', sku:'MC-LAD-008', barcode:'4003000000008', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Scaffolding Tower Frame 1.2x2.4m', sku:'MC-LAD-009', barcode:'4003000000009', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Scaffolding Plank Aluminium 3m', sku:'MC-LAD-010', barcode:'4003000000010', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Scaffolding Coupler Swivel', sku:'MC-LAD-011', barcode:'4003000000011', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Scaffolding Coupler Right Angle', sku:'MC-LAD-012', barcode:'4003000000012', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Scaffolding Tube 48mm (per m)', sku:'MC-LAD-013', barcode:'4003000000013', category:'Ladders', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Trestle Sawhorse Pair', sku:'MC-LAD-014', barcode:'4003000000014', category:'Ladders', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Platform Step 3-Level', sku:'MC-LAD-015', barcode:'4003000000015', category:'Ladders', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 31. WELDING (031-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Welding Electrode 2.5mm (per kg)', sku:'MC-WLD-001', barcode:'4003100000001', category:'Welding', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Welding Electrode 3.2mm (per kg)', sku:'MC-WLD-002', barcode:'4003100000002', category:'Welding', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Welding Electrode 4.0mm (per kg)', sku:'MC-WLD-003', barcode:'4003100000003', category:'Welding', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'MIG Wire 0.8mm 5kg Roll', sku:'MC-WLD-004', barcode:'4003100000004', category:'Welding', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'MIG Wire 1.0mm 5kg Roll', sku:'MC-WLD-005', barcode:'4003100000005', category:'Welding', brand:null, unit:{name:'Roll',abbr:'roll'}, sellType:'FIX', measurementUnit:'roll' },
  { name:'TIG Wire Aluminium 2.4mm (per kg)', sku:'MC-WLD-006', barcode:'4003100000006', category:'Welding', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'Arc Welding Machine 200A', sku:'MC-WLD-007', barcode:'4003100000007', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Arc Welding Machine 300A', sku:'MC-WLD-008', barcode:'4003100000008', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'MIG Welding Machine 200A', sku:'MC-WLD-009', barcode:'4003100000009', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Welding Cable 25mm (per m)', sku:'MC-WLD-010', barcode:'4003100000010', category:'Welding', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Welding Electrode Holder 300A', sku:'MC-WLD-011', barcode:'4003100000011', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Earth Clamp 300A', sku:'MC-WLD-012', barcode:'4003100000012', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Welding Apron Leather', sku:'MC-WLD-013', barcode:'4003100000013', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Chipping Hammer Welding', sku:'MC-WLD-014', barcode:'4003100000014', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wire Brush Welding 4 inch', sku:'MC-WLD-015', barcode:'4003100000015', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flux Powder 1kg', sku:'MC-WLD-016', barcode:'4003100000016', category:'Welding', brand:null, unit:{name:'Kilogram',abbr:'kg'}, sellType:'loose', measurementUnit:'kg' },
  { name:'LPG Regulator Welding', sku:'MC-WLD-017', barcode:'4003100000017', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Oxygen Regulator', sku:'MC-WLD-018', barcode:'4003100000018', category:'Welding', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Welding Hose 5m Set (Gas+O2)', sku:'MC-WLD-019', barcode:'4003100000019', category:'Welding', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },

  // ═══════════════════════════════════════════════════════════════════
  // 32. ABRASIVES & CUTTING (032-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Flap Disc 4 inch P40 (each)', sku:'MC-ABR-001', barcode:'4003200000001', category:'Abrasives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flap Disc 4 inch P80 (each)', sku:'MC-ABR-002', barcode:'4003200000002', category:'Abrasives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Flap Disc 4 inch P120 (each)', sku:'MC-ABR-003', barcode:'4003200000003', category:'Abrasives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Abrasive Cut-Off Disc 4 inch (pack 25)', sku:'MC-ABR-004', barcode:'4003200000004', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Abrasive Cut-Off Disc 7 inch (pack 10)', sku:'MC-ABR-005', barcode:'4003200000005', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Depressed Centre Grinding Disc 4 inch (pack 5)', sku:'MC-ABR-006', barcode:'4003200000006', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Sanding Belt 75x533mm P60 (pack 10)', sku:'MC-ABR-007', barcode:'4003200000007', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Sanding Belt 75x533mm P120 (pack 10)', sku:'MC-ABR-008', barcode:'4003200000008', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Orbital Sanding Pad 125mm P80 (pack 10)', sku:'MC-ABR-009', barcode:'4003200000009', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Orbital Sanding Pad 125mm P120 (pack 10)', sku:'MC-ABR-010', barcode:'4003200000010', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Emery Cloth Roll P80 (per m)', sku:'MC-ABR-011', barcode:'4003200000011', category:'Abrasives', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Steel Wool Grade 0 (pack 5)', sku:'MC-ABR-012', barcode:'4003200000012', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Cutting Blade HSS 300mm', sku:'MC-ABR-013', barcode:'4003200000013', category:'Abrasives', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Jigsaw Blade Metal T118A (pack 5)', sku:'MC-ABR-014', barcode:'4003200000014', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Jigsaw Blade Wood T101B (pack 5)', sku:'MC-ABR-015', barcode:'4003200000015', category:'Abrasives', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },

  // ═══════════════════════════════════════════════════════════════════
  // 33. GARDEN & IRRIGATION (033-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Garden Hose 1/2 inch 15m', sku:'MC-GRD-001', barcode:'4003300000001', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Garden Hose 1/2 inch 30m', sku:'MC-GRD-002', barcode:'4003300000002', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sprinkler Head Pop-Up', sku:'MC-GRD-003', barcode:'4003300000003', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sprinkler Head Impact', sku:'MC-GRD-004', barcode:'4003300000004', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Drip Irrigation Emitter 2L/hr (pack 100)', sku:'MC-GRD-005', barcode:'4003300000005', category:'Garden', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Drip Line Tube 16mm (per m)', sku:'MC-GRD-006', barcode:'4003300000006', category:'Garden', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Garden Soaker Hose (per m)', sku:'MC-GRD-007', barcode:'4003300000007', category:'Garden', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Garden Tap Timer Automatic', sku:'MC-GRD-008', barcode:'4003300000008', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hose Reel Wall Mounted 30m', sku:'MC-GRD-009', barcode:'4003300000009', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hand Trowel Garden', sku:'MC-GRD-010', barcode:'4003300000010', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Garden Rake Steel', sku:'MC-GRD-011', barcode:'4003300000011', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Garden Pruner Bypass', sku:'MC-GRD-012', barcode:'4003300000012', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hedge Trimmer Manual', sku:'MC-GRD-013', barcode:'4003300000013', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Lawn Mower Electric 1000W', sku:'MC-GRD-014', barcode:'4003300000014', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sprayer Knapsack 16L', sku:'MC-GRD-015', barcode:'4003300000015', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Sprayer Hand Pump 5L', sku:'MC-GRD-016', barcode:'4003300000016', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Wheelbarrow Plastic 65L', sku:'MC-GRD-017', barcode:'4003300000017', category:'Garden', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Fertilizer NPK 50kg', sku:'MC-GRD-018', barcode:'4003300000018', category:'Garden', brand:null, unit:{name:'Bag',abbr:'bag'}, sellType:'FIX', measurementUnit:'bag' },

  // ═══════════════════════════════════════════════════════════════════
  // 34. PUMPS & GENERATORS (034-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Submersible Pump 0.5HP', sku:'MC-PMP-001', barcode:'4003400000001', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Submersible Pump 1HP', sku:'MC-PMP-002', barcode:'4003400000002', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Submersible Pump 2HP', sku:'MC-PMP-003', barcode:'4003400000003', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Peripheral Pump 0.5HP', sku:'MC-PMP-004', barcode:'4003400000004', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Centrifugal Pump 1HP', sku:'MC-PMP-005', barcode:'4003400000005', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Jet Pump 1HP Self-Priming', sku:'MC-PMP-006', barcode:'4003400000006', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Booster Pump 0.75HP', sku:'MC-PMP-007', barcode:'4003400000007', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Water Tank 500L Round', sku:'MC-PMP-008', barcode:'4003400000008', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Water Tank 1000L Round', sku:'MC-PMP-009', barcode:'4003400000009', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pressure Tank 24L', sku:'MC-PMP-010', barcode:'4003400000010', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Generator 2.5kVA Petrol', sku:'MC-PMP-011', barcode:'4003400000011', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Generator 5.5kVA Petrol', sku:'MC-PMP-012', barcode:'4003400000012', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Generator 7.5kVA Diesel', sku:'MC-PMP-013', barcode:'4003400000013', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Air Compressor 50L 1HP', sku:'MC-PMP-014', barcode:'4003400000014', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Air Compressor 100L 2HP', sku:'MC-PMP-015', barcode:'4003400000015', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Inverter 1000W Pure Sine', sku:'MC-PMP-016', barcode:'4003400000016', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Inverter 2000W Pure Sine', sku:'MC-PMP-017', barcode:'4003400000017', category:'Pumps', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 35. INSULATION (035-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Rockwool Insulation 50mm (per m²)', sku:'MC-INS-001', barcode:'4003500000001', category:'Insulation', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Rockwool Insulation 100mm (per m²)', sku:'MC-INS-002', barcode:'4003500000002', category:'Insulation', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Glass Wool Blanket 50mm (per m²)', sku:'MC-INS-003', barcode:'4003500000003', category:'Insulation', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'EPS Polystyrene Board 25mm (per m²)', sku:'MC-INS-004', barcode:'4003500000004', category:'Insulation', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'EPS Polystyrene Board 50mm (per m²)', sku:'MC-INS-005', barcode:'4003500000005', category:'Insulation', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'XPS Extruded Polystyrene 30mm (per m²)', sku:'MC-INS-006', barcode:'4003500000006', category:'Insulation', brand:null, unit:{name:'Square Meter',abbr:'m²'}, sellType:'loose', measurementUnit:'m²' },
  { name:'Aluminium Foil Insulation (per m)', sku:'MC-INS-007', barcode:'4003500000007', category:'Insulation', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Rubber Foam Pipe Insulation 15mm (per m)', sku:'MC-INS-008', barcode:'4003500000008', category:'Insulation', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Rubber Foam Pipe Insulation 22mm (per m)', sku:'MC-INS-009', barcode:'4003500000009', category:'Insulation', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Pipe Insulation Lagging 1/2 inch (per m)', sku:'MC-INS-010', barcode:'4003500000010', category:'Insulation', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },

  // ═══════════════════════════════════════════════════════════════════
  // 36. MEASURING & LAYOUT TOOLS (036-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Digital Vernier Caliper 150mm', sku:'MC-MSR-001', barcode:'4003600000001', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Analogue Vernier Caliper 150mm', sku:'MC-MSR-002', barcode:'4003600000002', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Micrometer 0-25mm', sku:'MC-MSR-003', barcode:'4003600000003', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Digital Level Box 0.01°', sku:'MC-MSR-004', barcode:'4003600000004', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Laser Level Self-Levelling', sku:'MC-MSR-005', barcode:'4003600000005', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Laser Distance Meter 40m', sku:'MC-MSR-006', barcode:'4003600000006', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Laser Distance Meter 80m', sku:'MC-MSR-007', barcode:'4003600000007', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Measuring Wheel 100m', sku:'MC-MSR-008', barcode:'4003600000008', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Plumb Bob 200g', sku:'MC-MSR-009', barcode:'4003600000009', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Profile Gauge 250mm', sku:'MC-MSR-010', barcode:'4003600000010', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Digital Multimeter', sku:'MC-MSR-011', barcode:'4003600000011', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Clamp Meter AC/DC', sku:'MC-MSR-012', barcode:'4003600000012', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Non-Contact IR Thermometer', sku:'MC-MSR-013', barcode:'4003600000013', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Moisture Meter Wood & Building', sku:'MC-MSR-014', barcode:'4003600000014', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Angle Finder Digital', sku:'MC-MSR-015', barcode:'4003600000015', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Compass Rose Steel 150mm', sku:'MC-MSR-016', barcode:'4003600000016', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Stud Finder Electronic', sku:'MC-MSR-017', barcode:'4003600000017', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'GPS Survey Device Handheld', sku:'MC-MSR-018', barcode:'4003600000018', category:'Measuring Tools', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 37. SHELF & STORAGE HARDWARE (037-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Metal Shelf Bracket 200mm (pair)', sku:'MC-SHF-001', barcode:'4003700000001', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Metal Shelf Bracket 300mm (pair)', sku:'MC-SHF-002', barcode:'4003700000002', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Metal Shelf Bracket 400mm (pair)', sku:'MC-SHF-003', barcode:'4003700000003', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Bookshelf Rail 1m', sku:'MC-SHF-004', barcode:'4003700000004', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Bookshelf Rail 2m', sku:'MC-SHF-005', barcode:'4003700000005', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Shelf Support Peg 5mm (pack 20)', sku:'MC-SHF-006', barcode:'4003700000006', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Wire Mesh Shelf 900x300mm', sku:'MC-SHF-007', barcode:'4003700000007', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Steel Mesh Shelf Post 1.8m', sku:'MC-SHF-008', barcode:'4003700000008', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Slotted Angle Rack Beam 1.8m', sku:'MC-SHF-009', barcode:'4003700000009', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Storage Bin Small 30x20cm', sku:'MC-SHF-010', barcode:'4003700000010', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Storage Bin Large 40x30cm', sku:'MC-SHF-011', barcode:'4003700000011', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Tool Cabinet 5-Drawer Steel', sku:'MC-SHF-012', barcode:'4003700000012', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pegboard Sheet 600x1200mm', sku:'MC-SHF-013', barcode:'4003700000013', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pegboard Hook 100mm (pack 10)', sku:'MC-SHF-014', barcode:'4003700000014', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },

  // ═══════════════════════════════════════════════════════════════════
  // 38. HVAC & VENTILATION (038-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'PVC Air Duct 150mm (per m)', sku:'MC-HVC-001', barcode:'4003800000001', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'PVC Air Duct 200mm (per m)', sku:'MC-HVC-002', barcode:'4003800000002', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Flexible Duct 150mm (per m)', sku:'MC-HVC-003', barcode:'4003800000003', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Exhaust Grille 200x200mm', sku:'MC-HVC-004', barcode:'4003800000004', category:'HVAC', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Supply Air Diffuser 300x300mm', sku:'MC-HVC-005', barcode:'4003800000005', category:'HVAC', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Inline Duct Fan 150mm', sku:'MC-HVC-006', barcode:'4003800000006', category:'HVAC', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Window AC Bracket', sku:'MC-HVC-007', barcode:'4003800000007', category:'HVAC', brand:null, unit:{name:'Set',abbr:'set'}, sellType:'FIX', measurementUnit:'set' },
  { name:'AC Drain Pipe 20mm (per m)', sku:'MC-HVC-008', barcode:'4003800000008', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Refrigerant Copper Pipe 1/4 inch (per m)', sku:'MC-HVC-009', barcode:'4003800000009', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Refrigerant Copper Pipe 3/8 inch (per m)', sku:'MC-HVC-010', barcode:'4003800000010', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Insulated AC Pipe 1/4+3/8 inch Pair (per m)', sku:'MC-HVC-011', barcode:'4003800000011', category:'HVAC', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Air Freshener Dispenser Wall', sku:'MC-HVC-012', barcode:'4003800000012', category:'HVAC', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },

  // ═══════════════════════════════════════════════════════════════════
  // 39. MISCELLANEOUS HARDWARE (039-xxx)
  // ═══════════════════════════════════════════════════════════════════
  { name:'Eye Bolt M8 50mm', sku:'MC-MSC-001', barcode:'4003900000001', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Eye Bolt M10 75mm', sku:'MC-MSC-002', barcode:'4003900000002', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hook & Eye Screw 50mm (pair)', sku:'MC-MSC-003', barcode:'4003900000003', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Carabiner Clip 50mm', sku:'MC-MSC-004', barcode:'4003900000004', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Pulleys Single 50mm', sku:'MC-MSC-005', barcode:'4003900000005', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Rope Nylon 10mm (per m)', sku:'MC-MSC-006', barcode:'4003900000006', category:'Hardware', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Rope Manila 12mm (per m)', sku:'MC-MSC-007', barcode:'4003900000007', category:'Hardware', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Chain Zinc Plated 6mm (per m)', sku:'MC-MSC-008', barcode:'4003900000008', category:'Hardware', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Chain Heavy 8mm (per m)', sku:'MC-MSC-009', barcode:'4003900000009', category:'Hardware', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Wire Rope 3mm (per m)', sku:'MC-MSC-010', barcode:'4003900000010', category:'Hardware', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Wire Rope 6mm (per m)', sku:'MC-MSC-011', barcode:'4003900000011', category:'Hardware', brand:null, unit:{name:'Meter',abbr:'m'}, sellType:'loose', measurementUnit:'m' },
  { name:'Turnbuckle M8', sku:'MC-MSC-012', barcode:'4003900000012', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Corner Bracket 50mm (pair)', sku:'MC-MSC-013', barcode:'4003900000013', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Angle Bracket 75mm (pair)', sku:'MC-MSC-014', barcode:'4003900000014', category:'Hardware', brand:null, unit:{name:'Pair',abbr:'pr'}, sellType:'FIX', measurementUnit:'pr' },
  { name:'Pipe Clip 20mm (pack 10)', sku:'MC-MSC-015', barcode:'4003900000015', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Pipe Clip 25mm (pack 10)', sku:'MC-MSC-016', barcode:'4003900000016', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Pipe Clip 32mm (pack 10)', sku:'MC-MSC-017', barcode:'4003900000017', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Pipe Clip 50mm (pack 10)', sku:'MC-MSC-018', barcode:'4003900000018', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Rubber Grommet 20mm (pack 10)', sku:'MC-MSC-019', barcode:'4003900000019', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Rubber Feet 20mm Round (pack 4)', sku:'MC-MSC-020', barcode:'4003900000020', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Split Pin 3x30mm (pack 20)', sku:'MC-MSC-021', barcode:'4003900000021', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Clevis Pin 10mm (each)', sku:'MC-MSC-022', barcode:'4003900000022', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Snap Ring External 15mm (pack 5)', sku:'MC-MSC-023', barcode:'4003900000023', category:'Hardware', brand:null, unit:{name:'Pack',abbr:'pack'}, sellType:'FIX', measurementUnit:'pack' },
  { name:'Hose Clamp 20-32mm (each)', sku:'MC-MSC-024', barcode:'4003900000024', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hose Clamp 32-50mm (each)', sku:'MC-MSC-025', barcode:'4003900000025', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Hose Clamp 50-70mm (each)', sku:'MC-MSC-026', barcode:'4003900000026', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Magnetic Hook Strong 25kg', sku:'MC-MSC-027', barcode:'4003900000027', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
  { name:'Magnetic Base Indicator Stand', sku:'MC-MSC-028', barcode:'4003900000028', category:'Hardware', brand:null, unit:{name:'Piece',abbr:'pcs'}, sellType:'FIX', measurementUnit:'pcs' },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function main() {
  console.log(`🌍 Seeding Global Master Catalog (${MASTER_PRODUCTS.length} products)...`);

  // 1. Find or create SYSTEM_ADMIN_SHOP
  let adminShop = await prisma.shop.findFirst({ where: { name: 'SYSTEM_ADMIN_SHOP' } });
  if (!adminShop) {
    adminShop = await prisma.shop.create({
      data: { name:'SYSTEM_ADMIN_SHOP', businessRegistration:'SYS-000', subscriptionPlan:'SUPER_ADMIN', paymentStatus:'PAID', subscriptionStatus:'ACTIVE' },
    });
    console.log(`  ✅ Created SYSTEM_ADMIN_SHOP: ${adminShop.id}`);
  } else {
    console.log(`  ✅ SYSTEM_ADMIN_SHOP exists: ${adminShop.id}`);
  }
  const shopId = adminShop.id;

  // 2. Collect unique categories, brands, units
  const allCategoryNames = [...new Set(MASTER_PRODUCTS.map(p => p.category))];
  const allBrandNames    = [...new Set(MASTER_PRODUCTS.map(p => p.brand).filter(Boolean))] as string[];
  const allUnitsMap: Record<string, { name:string; abbr:string }> = {};
  for (const p of MASTER_PRODUCTS) allUnitsMap[p.unit.name] = p.unit;

  // 3. Upsert Categories
  const categoryMap: Record<string, string> = {};
  for (const catName of allCategoryNames) {
    let cat = await prisma.category.findFirst({ where: { tenantId:shopId, name:catName } });
    if (!cat) cat = await prisma.category.create({ data:{ tenantId:shopId, name:catName, isActive:true } });
    categoryMap[catName] = cat.id;
  }
  console.log(`  ✅ ${allCategoryNames.length} categories ready`);

  // 4. Upsert Brands
  const brandMap: Record<string, string> = {};
  for (const brandName of allBrandNames) {
    let brand = await prisma.brand.findFirst({ where: { tenantId:shopId, name:brandName } });
    if (!brand) brand = await prisma.brand.create({ data:{ tenantId:shopId, name:brandName, isActive:true } });
    brandMap[brandName] = brand.id;
  }
  console.log(`  ✅ ${allBrandNames.length} brands ready`);

  // 5. Upsert Units
  const unitMap: Record<string, string> = {};
  for (const [unitName, unitData] of Object.entries(allUnitsMap)) {
    let unit = await prisma.unit.findFirst({ where: { tenantId:shopId, name:unitName } });
    if (!unit) unit = await prisma.unit.create({ data:{ tenantId:shopId, name:unitData.name, abbreviation:unitData.abbr } });
    unitMap[unitName] = unit.id;
  }
  console.log(`  ✅ ${Object.keys(allUnitsMap).length} units ready`);

  // 6. Create or Update Products
  let created = 0; let skipped = 0; let aliasUpdated = 0;
  for (const pd of MASTER_PRODUCTS) {
    const aliasStr = pd.aliases && pd.aliases.length > 0 ? pd.aliases.join(' | ') : undefined;

    const existing = await prisma.product.findUnique({ where: { tenantId_sku: { tenantId:shopId, sku:pd.sku } } });
    if (existing) {
      // Update aliases on existing products
      if (aliasStr && existing.description !== aliasStr) {
        await prisma.product.update({ where: { id: existing.id }, data: { description: aliasStr } });
        aliasUpdated++;
      }
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        tenantId: shopId,
        name: pd.name,
        sku: pd.sku,
        barcode: pd.barcode,
        description: aliasStr,
        categoryId: categoryMap[pd.category],
        brandId: pd.brand ? brandMap[pd.brand] : undefined,
        unitId: unitMap[pd.unit.name],
        sellingPrice: 0,
        purchasePrice: 0,
        sellType: pd.sellType,
        measurementUnit: pd.measurementUnit,
        taxCategory: TaxCategory.STANDARD_VAT,
        isActive: true,
        images: pd.image ? { create: [{ imageUrl: pd.image, isPrimary:true }] } : undefined,
      },
    });
    created++;
    process.stdout.write(`\r  + Imported ${created} of ${MASTER_PRODUCTS.length}...`);
  }

  console.log(`\n\n✅ Seed complete: ${created} created, ${skipped} already existed (${aliasUpdated} alias descriptions updated). Total: ${MASTER_PRODUCTS.length} master products.`);
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

// ─── STANDALONE ALIAS UPDATER (run via: npm run seed:aliases) ─────────────────
// To update aliases on EXISTING master catalog products without re-seeding everything
export async function updateAliases() {
  console.log('🏷️  Updating search aliases for existing master catalog products...');
  const adminShop = await prisma.shop.findFirst({ where: { name: 'SYSTEM_ADMIN_SHOP' } });
  if (!adminShop) { console.error('❌ SYSTEM_ADMIN_SHOP not found.'); return; }

  let updated = 0;
  for (const pd of MASTER_PRODUCTS) {
    if (!pd.aliases || pd.aliases.length === 0) continue;
    const aliasStr = pd.aliases.join(' | ');
    await prisma.product.updateMany({
      where: { tenantId: adminShop.id, sku: pd.sku },
      data: { description: aliasStr },
    });
    updated++;
  }
  console.log(`✅ Updated aliases for ${updated} master products.`);
}

