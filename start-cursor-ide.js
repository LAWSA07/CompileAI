#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting LAWSA Cursor IDE...\n');

// Check if we're in the right directory
const electronAppPath = path.join(__dirname, 'electron-app');
if (!fs.existsSync(electronAppPath)) {
    console.error('❌ Error: electron-app directory not found');
    console.log('Please run this script from the project root directory');
    process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(electronAppPath, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...');
    
    const installProcess = spawn('npm', ['install'], {
        cwd: electronAppPath,
        stdio: 'inherit'
    });
    
    installProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Dependencies installed successfully');
            startElectronApp();
        } else {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
    });
} else {
    console.log('✅ Dependencies already installed');
    startElectronApp();
}

function startElectronApp() {
    console.log('🎯 Launching Electron app...\n');
    
    const electronProcess = spawn('npm', ['start'], {
        cwd: electronAppPath,
        stdio: 'inherit'
    });
    
    electronProcess.on('close', (code) => {
        if (code === 0) {
            console.log('\n👋 LAWSA Cursor IDE closed successfully');
        } else {
            console.log(`\n⚠️  LAWSA Cursor IDE exited with code ${code}`);
        }
    });
    
    electronProcess.on('error', (error) => {
        console.error('❌ Failed to start Electron app:', error.message);
        process.exit(1);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    process.exit(0);
}); 