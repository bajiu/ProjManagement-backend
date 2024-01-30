const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const path = require('path');


const express = require('express');
const app = express();
const port = 3000;


const menu = require('./data/menu.js');
const {treeFiles} = require("./common/fileInfo");
function response(res, code, msg, data) {
    res.status(code).json({ code, msg, data });
}

// 连接MongoDB数据库
mongoose.connect('mongodb://127.0.0.1:27017/documentDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('已连接至MongoDB'))
    .catch(err => console.error('MongoDB连接失败', err));

// 定义文件模型
const documentSchema = new mongoose.Schema({
    name: String,
    version: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
});

const versionSchema = new mongoose.Schema({
    name: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
});

// 创建文件模型
const Document = mongoose.model('Document', documentSchema);
// 创建版本模型
const Version = mongoose.model('Version', versionSchema);

app.get('/', (req, res) => {
    res.send('文档管理系统');
});

app.get('/v1/version/list', async (req, res) => {
    try {
        const versions = await Version.find();
        response(res, 200, '获取所有版本成功', versions);
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
});


// 创建版本
app.get('/v1/version/save', async (req, res) => {
    try {
        const v = req.query.version;
        let version = await Version.findOne({ name: v });
        if(version) {
            // 如果有版本名称，返回错误
            return response(res, 400, '版本名称已存在', null);
        } else {
            // 如果没有版本名称，创建新版本
            version = new Version({ name: v, path: 'uploads' });
            await version.save();
            response(res, 200, '版本创建成功', v);
        }
    } catch (error) {
        response(res, 500, '版本创建失败', error);
    }
});

// 上传文件
app.post('/v1/file/upload', upload.single('file'), async (req, res) => {
    if (req.headers.version) {
        // 请求头有版本号
        const versionId = req.headers.version;
        // 查找版本号是否存在
        const v = await Version.findOne({ _id: versionId });
        if (!v) {
            return response(res, 404, '版本未找到', null);
        } else {
            if (!req.file) {
                return response(res, 400, '没有文件上传', null);
            }
            const file = req.file;
            // 获取文件名
            const documentName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
            let document = await Document.findOne({ name: documentName });
            if(!document) {
                // 创建/检查版本号文件夹
                const versionFolderPath = path.join(__dirname, 'uploads', `${v.name}`);
                if (!fs.existsSync(versionFolderPath)) {
                    fs.mkdirSync(versionFolderPath, { recursive: true });
                }
                // 文件路径更新为版本文件夹路径
                const filePath = path.join(versionFolderPath, documentName);
                // 移动文件到版本文件夹
                fs.renameSync(file.path, filePath);
                // 创建文档对象并保存
                // 如果文档不存在，创建新文档
                document = new Document({ name: documentName, version: versionId, path: filePath });
                await document.save();
                response(res, 201, '文件上传成功', document);
            } else {
                response(res, 500, '有这个文件了');
            }
        }

    } else {
        response(res, 500, '请求头没有版本号');
    }
    //var originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    return;
    if (!req.file) {
        return response(res, 400, '没有文件上传', null);
    }
    const file = req.file;
    // 获取文件名
    const documentName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    try {
        let document = await Document.findOne({ name: documentName });
        let newVersionNumber;

        if (document) {
            // 如果文档已存在，计算新版本号
            newVersionNumber = document.versions.length + 1;
        } else {
            // 如果文档不存在，创建新文档
            newVersionNumber = 1;
            document = new Document({ name: documentName, versions: [] });
        }

        // 创建/检查版本号文件夹
        const versionFolderPath = path.join(__dirname, 'uploads', `v${newVersionNumber}`);
        if (!fs.existsSync(versionFolderPath)) {
            fs.mkdirSync(versionFolderPath, { recursive: true });
        }

        // 文件路径更新为版本文件夹路径
        const filePath = path.join(versionFolderPath, documentName);

        // 移动文件到版本文件夹
        fs.renameSync(file.path, filePath);

        // 更新文档对象并保存
        document.versions.push({ versionNumber: newVersionNumber, path: filePath });
        await document.save();

        response(res, 201, '文件上传成功', document);
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
});

app.get('/documents', async (req, res) => {
    try {
        const documents = await Document.find();
        res.send(documents);
    } catch (error) {
        res.status(500).send(error);
    }
});


app.get('/v1/menu/list', async (req, res) => {
    try {
        response(res, 200, '模拟文件上传成功', menu);
    } catch (error) {
        response(res, 500, '模拟文件上传成功', error);
    }
});



app.get('/v1/upload/mock', async (req, res) => {
    const mockFileName = req.query.name;
    if (!mockFileName) {
        return response(res, 400, '需要提供文件名', null);
    }

    const mockFilePath = `mock/uploads/${mockFileName}`;
    const mockVersionNumber = 1;

    try {
        let document = await Document.findOne({ name: mockFileName });

        if (document) {
            // 如果文档已存在，增加新的版本号
            const newVersionNumber = document.versions.length + 1;
            document.versions.push({ versionNumber: newVersionNumber, path: mockFilePath });
            await document.save();
        } else {
            // 如果文档不存在，创建新文档
            document = new Document({
                name: mockFileName,
                versions: [{ versionNumber: mockVersionNumber, path: mockFilePath }]
            });
            await document.save();
        }

        response(res, 201, '模拟文件上传成功', document);
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
});
// 获取文件版本列表
app.get('/v1/documents/versions', async (req, res) => {
    try {
        const versionId = req.query.version;
        if (!versionId) {
            // 没传就返回所有
            const documents = await Document.find();
            response(res, 200, '获取全部文件列表成功', documents);
        } else {
            const v = await Version.findOne({ _id: versionId });
            if (!v) {
                return response(res, 404, '版本未找到', null);
            } else {
                const documents = await Document.find({ version: versionId});
                response(res, 200, '获取文件列表成功', documents);
            }
        }
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
});
// 获取所有文档
app.get('/v1/documents', async (req, res) => {
    try {
        const documents = await Document.find();
        response(res, 200, '获取所有文档成功', documents);
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
});

// 获取树形图数据
app.get('/v1/documents/tree', (req, res) => {
    try {
        const dir = path.join(__dirname, 'uploads'); // 指定开始遍历的目录
        const fileTree = treeFiles(dir);
        response(res, 200, '文件列表获取成功', fileTree);
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
});


app.get('/v1/download/:id', async (req, res) => {
    try {
        const documentId = req.params.id;
        console.log('==================')
        console.log(documentId)
        const document = await Document.findById(documentId);
        if (!document) {
            return response(res, 404, '文件未找到');
        } else {
            // 设置文件路径
            const filePath = document.path;
            // 设置文件名
            res.download(filePath, document.name);
        }
    } catch (error) {
        response(res, 500, '服务器错误', error);
    }
})


app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});