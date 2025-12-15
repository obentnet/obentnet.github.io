// script.js

// --- 1. 数据结构 (Model) ---
let bookmarksData = {
    unorganized: [], // 待整理的书签列表
    folders: []      // 文件夹列表
};

// --- 2. 元素引用 (DOM Refs) ---
const fileUpload = document.getElementById('file-upload');
const exportBtn = document.getElementById('export-btn');
const unorganizedList = document.getElementById('unorganized-list');
const foldersContainer = document.getElementById('folders-container');
const newFolderNameInput = document.getElementById('new-folder-name');
const createFolderBtn = document.getElementById('create-folder-btn');

// --- 3. 核心工具函数 ---

// A. 解析 HTML (将 Chrome HTML 转换为 JS 数组)
function parseBookmarksHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    
    return links.map(link => ({
        id: crypto.randomUUID(),
        title: link.textContent || '未命名',
        url: link.href
    }));
}

// B. 生成 HTML (将 JS 数组转换回 Chrome 可识别的 HTML 格式)
function generateBookmarkHTML() {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;

    bookmarksData.folders.forEach(folder => {
        html += `<DT><H3>${folder.title}</H3>\n<DL><p>\n`;
        folder.children.forEach(bm => {
            // 使用 ADD_DATE 占位符确保格式更规范
            html += `<DT><A HREF="${bm.url}" ADD_DATE="0">${bm.title}</A>\n`;
        });
        html += `</DL><p>\n`;
    });

    html += `</DL><p>`;
    return html;
}

// C. 渲染函数 (将 JS 数据结构渲染为 DOM 元素)
function render() {
    // 渲染待整理池
    unorganizedList.innerHTML = '';
    bookmarksData.unorganized.forEach(bm => {
        unorganizedList.appendChild(createBookmarkCard(bm));
    });

    // 渲染文件夹
    foldersContainer.innerHTML = '';
    bookmarksData.folders.forEach(folder => {
        foldersContainer.appendChild(createFolderBox(folder));
    });

    // 更新导出按钮状态
    exportBtn.disabled = bookmarksData.unorganized.length === 0 && bookmarksData.folders.every(f => f.children.length === 0);
}

// D. 创建书签卡片 DOM
function createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.draggable = true; // 启用 HTML5 拖拽
    card.dataset.id = bookmark.id;
    
    // 显示 Favicon 和标题
    const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain_url=${bookmark.url}`;
    card.innerHTML = `<img src="${faviconUrl}" width="16" height="16" style="margin-right: 5px;">${bookmark.title}`;
    
    return card;
}

// E. 创建文件夹 DOM
function createFolderBox(folder) {
    const folderBox = document.createElement('div');
    folderBox.className = 'folder-box';
    folderBox.dataset.id = folder.id;

    folderBox.innerHTML = `
        <h3>
            ${folder.title} 
            <button class="remove-folder-btn" data-id="${folder.id}">×</button>
        </h3>
        <div class="drag-list" data-folder-id="${folder.id}"></div>
    `;

    const list = folderBox.querySelector('.drag-list');
    
    // 渲染文件夹内的书签
    folder.children.forEach(bm => {
        list.appendChild(createBookmarkCard(bm));
    });

    // 注册删除按钮事件
    folderBox.querySelector('.remove-folder-btn').addEventListener('click', (e) => {
        // 将文件夹内的书签移回待整理池
        const folderIndex = bookmarksData.folders.findIndex(f => f.id === e.target.dataset.id);
        if (folderIndex > -1) {
            bookmarksData.unorganized.push(...bookmarksData.folders[folderIndex].children);
            bookmarksData.folders.splice(folderIndex, 1);
            render();
        }
    });

    return folderBox;
}

// --- 4. 事件处理函数 ---

// A. 导入文件
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const html = event.target.result;
        bookmarksData.unorganized = parseBookmarksHTML(html);
        bookmarksData.folders = []; // 清空之前的整理
        render();
        // 重置 input 避免选择相同文件不触发 change 事件
        e.target.value = null;
    };
    reader.readAsText(file);
});

// B. 创建文件夹
createFolderBtn.addEventListener('click', () => {
    const name = newFolderNameInput.value.trim();
    if (name) {
        bookmarksData.folders.push({
            id: crypto.randomUUID(),
            title: name,
            children: []
        });
        newFolderNameInput.value = '';
        render();
    }
});

// C. 导出文件
exportBtn.addEventListener('click', () => {
    const htmlString = generateBookmarkHTML();
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `organized_bookmarks_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    
    URL.revokeObjectURL(url);
});

// --- 5. 拖拽逻辑 (Drag & Drop) ---

let draggedItem = null; // 存储当前拖动的书签卡片

// 拖拽开始：设置数据和样式
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('bookmark-card')) {
        draggedItem = e.target;
        e.target.classList.add('dragging');
        // 在 dataTransfer 上设置书签 ID
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
    }
});

// 拖拽结束：清理样式
document.addEventListener('dragend', (e) => {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }
});

// 拖拽经过：阻止默认行为，允许放置
document.addEventListener('dragover', (e) => {
    // 只允许拖拽到 .drag-list 区域
    if (e.target.closest('.drag-list')) {
        e.preventDefault();
        // 可选：添加视觉反馈
        e.target.closest('.drag-list').style.backgroundColor = '#e0f7fa';
    }
});

// 拖拽离开：清理视觉反馈
document.addEventListener('dragleave', (e) => {
    if (e.target.closest('.drag-list')) {
        e.target.closest('.drag-list').style.backgroundColor = '#eef2f5';
        // 清理文件夹的背景
        const folderList = e.target.closest('.folder-box .drag-list');
        if (folderList) {
             folderList.style.backgroundColor = '#fff';
        }
    }
});


// 放置事件：处理核心数据移动
document.addEventListener('drop', (e) => {
    const targetList = e.target.closest('.drag-list');
    if (targetList) {
        e.preventDefault();
        targetList.style.backgroundColor = '#eef2f5'; // 清理视觉反馈

        const bookmarkId = e.dataTransfer.getData('text/plain');
        const isTargetUnorganized = targetList.id === 'unorganized-list';
        const targetFolderId = targetList.dataset.folderId;
        
        let bookmarkToMove;
        let originalSourceIndex = -1;
        let originalSourceType = ''; // 'unorganized' 或 folderId

        // 1. 从原位置移除书签
        
        // 1.1 尝试从 'unorganized' 移除
        originalSourceIndex = bookmarksData.unorganized.findIndex(bm => bm.id === bookmarkId);
        if (originalSourceIndex > -1) {
            bookmarkToMove = bookmarksData.unorganized.splice(originalSourceIndex, 1)[0];
            originalSourceType = 'unorganized';
        }

        // 1.2 尝试从 'folders' 移除
        if (!bookmarkToMove) {
            bookmarksData.folders.forEach(folder => {
                originalSourceIndex = folder.children.findIndex(bm => bm.id === bookmarkId);
                if (originalSourceIndex > -1) {
                    bookmarkToMove = folder.children.splice(originalSourceIndex, 1)[0];
                    originalSourceType = folder.id;
                }
            });
        }
        
        if (!bookmarkToMove) return; // 没找到书签，退出

        // 2. 移动到新位置

        if (isTargetUnorganized) {
            // 移到待整理池
            bookmarksData.unorganized.push(bookmarkToMove);
        } else if (targetFolderId) {
            // 移到某个文件夹
            const targetFolder = bookmarksData.folders.find(f => f.id === targetFolderId);
            if (targetFolder) {
                targetFolder.children.push(bookmarkToMove);
            }
        }
        
        // 3. 重新渲染整个界面
        render();
    }
});

// 初始化渲染
render();