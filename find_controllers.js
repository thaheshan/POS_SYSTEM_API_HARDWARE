const fs = require('fs');
const path = require('path');

function findControllers(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findControllers(fullPath);
    } else if (fullPath.endsWith('.controller.ts')) {
      console.log(fullPath);
    }
  }
}

findControllers('C:\\Users\\Thahe\\Documents\\GitHub\\POS_SYSTEM_API_HARDWARE\\src');
