const fs = require('fs');
const path = require('path');

// 递归获取目录下的所有文件
function treeFiles(dir) {
    const files = fs.readdirSync(dir);
    const fileTree = [];

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const fileStat = fs.statSync(filePath);

        if (fileStat.isDirectory()) {
            fileTree.push({
                name: file,
                type: 'directory',
                children: treeFiles(filePath) // 递归调用以获取子目录
            });
        } else {
            fileTree.push({
                name: file,
                type: 'file'
            });
        }
    });

    return fileTree;
}


module.exports = {
    treeFiles
};