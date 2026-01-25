
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(process.cwd(), 'src');
const appApi = path.join(srcDir, 'app', 'api');
const appApiTemp = path.join(process.cwd(), 'app_api_backup');
const pagesApi = path.join(srcDir, 'pages', 'api');
const pagesApiTemp = path.join(process.cwd(), 'pages_api_backup');

function moveDir(src, dest) {
    if (fs.existsSync(src)) {
        console.log(`Moving ${src} -> ${dest}`);
        fs.renameSync(src, dest);
        return true;
    }
    return false;
}

const movedApp = moveDir(appApi, appApiTemp);
const movedPages = moveDir(pagesApi, pagesApiTemp);

try {
    console.log('Running build:static...');
    execSync('npm run build:static', { stdio: 'inherit' });
    console.log('Build success!');
} catch (e) {
    console.error('Build failed!');
    process.exitCode = 1;
} finally {
    // Restoration
    if (movedApp) moveDir(appApiTemp, appApi);
    if (movedPages) moveDir(pagesApiTemp, pagesApi);
}
