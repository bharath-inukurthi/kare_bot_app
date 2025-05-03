// Run this with: node direct-patch.js
const fs = require('fs');
const path = require('path');

console.log('Starting direct patch of Expo Metro Config...');

// Path to the problematic file that's trying to import the missing module
const reconcilePluginPath = path.join(
  __dirname, 
  'node_modules', 
  '@expo', 
  'metro-config', 
  'build', 
  'serializer', 
  'reconcileTransformSerializerPlugin.js'
);

console.log(`Checking for file: ${reconcilePluginPath}`);

if (fs.existsSync(reconcilePluginPath)) {
  console.log('Found file, reading content...');
  const content = fs.readFileSync(reconcilePluginPath, 'utf8');
  
  // Create a backup
  fs.writeFileSync(`${reconcilePluginPath}.bak`, content);
  console.log('Backup created.');
  
  // Replace the problematic import with a mock
  const patchedContent = content.replace(
    "const importLocationsPlugin = require('metro/src/ModuleGraph/worker/importLocationsPlugin');",
    `// Mock implementation to avoid the missing module error
const importLocationsPlugin = function() {
  return {
    visitor: {
      ImportDeclaration() {},
      ExportDeclaration() {}
    }
  };
};`
  );
  
  fs.writeFileSync(reconcilePluginPath, patchedContent);
  console.log('File patched successfully!');
} else {
  console.error('Could not find the file to patch!');
}

// Also create the missing module as a backup plan
const moduleDir = path.join(__dirname, 'node_modules', 'metro', 'src', 'ModuleGraph', 'worker');
const modulePath = path.join(moduleDir, 'importLocationsPlugin.js');

console.log(`Creating directory: ${moduleDir}`);
if (!fs.existsSync(moduleDir)) {
  fs.mkdirSync(moduleDir, { recursive: true });
}

console.log(`Creating module file: ${modulePath}`);
fs.writeFileSync(modulePath, `
// Mock implementation of the missing module
module.exports = function importLocationsPlugin() {
  return {
    visitor: {
      ImportDeclaration() {},
      ExportDeclaration() {}
    }
  };
};
`);

console.log('Done! Now try running: npx expo start');