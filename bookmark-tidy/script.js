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

// 编辑模态框引用
const editModal = document.getElementById('edit-modal');
const closeBtn = editModal.querySelector('.close-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveEditBtn = document.getElementById('save-edit-btn');
const editTitleInput = document.getElementById('edit-title');
const editUrlInput = document.getElementById('edit-url');

let currentEditingBookmarkId = null; // 追踪当前正在编辑的书签ID


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
        html += `    <DT><H3 ADD_DATE="0">${folder.title}</H3>\n    <DL><p>\n`;
        folder.children.forEach(bm => {
            html += `        <DT><A HREF="${bm.url}" ADD_DATE="0">${bm.title}</A>\n`;
        });
        html += `    </DL><p>\n`;
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

    // 更新导出按钮状态：只有当有内容需要导出时才启用
    const hasDataToExport = bookmarksData.folders.some(f => f.children.length > 0) || bookmarksData.unorganized.length > 0;
    exportBtn.disabled = !hasDataToExport;
}

// D. 创建书签卡片 DOM (包含编辑按钮和可识别的 Favicon 元素)
function createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.draggable = true; 
    card.dataset.id = bookmark.id;
    
    // 根据 URL 生成 Favicon 链接
    const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain_url=${bookmark.url}`;
    
    const contentHtml = `
        <div style="display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex-grow: 1;">
            <img class="favicon-img" data-url="${bookmark.url}" src="${faviconUrl}" width="16" height="16" style="margin-right: 5px; flex-shrink: 0;">
            <span style="overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${bookmark.title}</span>
        </div>
        <button class="edit-btn" data-id="${bookmark.id}" style="
            background: none; 
            border: none; 
            color: #007bff; 
            cursor: pointer; 
            font-weight: bold;
            margin-left: 10px;
            flex-shrink: 0; 
        ">✎</button>
    `;

    card.innerHTML = contentHtml;
    
    // 注册编辑按钮事件 (保持不变)
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openEditModal(id);
        e.stopPropagation();
    });
    
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
            <button class="remove-folder-btn button secondary" data-id="${folder.id}">移除</button>
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
        const folderIdToRemove = e.target.dataset.id;
        const folderIndex = bookmarksData.folders.findIndex(f => f.id === folderIdToRemove);
        
        if (folderIndex > -1) {
            // 将文件夹内的书签移回待整理池
            bookmarksData.unorganized.push(...bookmarksData.folders[folderIndex].children);
            // 移除文件夹
            bookmarksData.folders.splice(folderIndex, 1);
            render();
        }
    });

    return folderBox;
}

// --- 4. 导入、创建、导出事件 ---

// A. 导入文件
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const html = event.target.result;
        bookmarksData.unorganized = parseBookmarksHTML(html);
        bookmarksData.folders = []; 
        render();
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

let draggedItem = null; 

// 拖拽开始：设置数据和样式
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('bookmark-card')) {
        draggedItem = e.target;
        e.target.classList.add('dragging');
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

// 拖拽经过：允许放置
document.addEventListener('dragover', (e) => {
    if (e.target.closest('.drag-list')) {
        e.preventDefault();
        e.target.closest('.drag-list').style.backgroundColor = '#e0f7fa';
    }
});

// 拖拽离开：清理视觉反馈
document.addEventListener('dragleave', (e) => {
    const targetList = e.target.closest('.drag-list');
    if (targetList) {
        // 恢复默认背景
        targetList.style.backgroundColor = targetList.id === 'unorganized-list' ? '#eef2f5' : '#fff';
    }
});


// 放置事件：处理核心数据移动
document.addEventListener('drop', (e) => {
    const targetList = e.target.closest('.drag-list');
    if (targetList) {
        e.preventDefault();
        // 清理视觉反馈
        targetList.style.backgroundColor = targetList.id === 'unorganized-list' ? '#eef2f5' : '#fff'; 

        const bookmarkId = e.dataTransfer.getData('text/plain');
        const isTargetUnorganized = targetList.id === 'unorganized-list';
        const targetFolderId = targetList.dataset.folderId;
        
        let bookmarkToMove = null;

        // 1. 从原位置移除书签
        
        // 1.1 尝试从 'unorganized' 移除
        const unorganizedIndex = bookmarksData.unorganized.findIndex(bm => bm.id === bookmarkId);
        if (unorganizedIndex > -1) {
            bookmarkToMove = bookmarksData.unorganized.splice(unorganizedIndex, 1)[0];
        }

        // 1.2 尝试从 'folders' 移除
        if (!bookmarkToMove) {
            bookmarksData.folders.forEach(folder => {
                const folderIndex = folder.children.findIndex(bm => bm.id === bookmarkId);
                if (folderIndex > -1) {
                    bookmarkToMove = folder.children.splice(folderIndex, 1)[0];
                }
            });
        }
        
        if (!bookmarkToMove) return; 

        // 2. 移动到新位置

        if (isTargetUnorganized) {
            bookmarksData.unorganized.push(bookmarkToMove);
        } else if (targetFolderId) {
            const targetFolder = bookmarksData.folders.find(f => f.id === targetFolderId);
            if (targetFolder) {
                targetFolder.children.push(bookmarkToMove);
            }
        }
        
        // 3. 重新渲染整个界面
        render();
    }
});

// --- 6. 编辑模态框逻辑 ---

// 查找书签 (无论在待整理区还是文件夹内)
function findBookmarkById(id) {
    let bookmark = bookmarksData.unorganized.find(bm => bm.id === id);
    if (bookmark) return bookmark;

    for (const folder of bookmarksData.folders) {
        bookmark = folder.children.find(bm => bm.id === id);
        if (bookmark) return bookmark;
    }

    return null;
}

// 打开编辑模态框
function openEditModal(id) {
    const bookmark = findBookmarkById(id);
    if (!bookmark) return;

    currentEditingBookmarkId = id;
    
    // 填充当前书签数据
    editTitleInput.value = bookmark.title;
    editUrlInput.value = bookmark.url;

    editModal.style.display = 'block';
}

// 保存修改
function saveBookmark() {
    if (!currentEditingBookmarkId) return;

    const bookmark = findBookmarkById(currentEditingBookmarkId);
    if (bookmark) {
        // 更新数据模型
        bookmark.title = editTitleInput.value.trim();
        bookmark.url = editUrlInput.value.trim();
        
        render();
    }
    
    closeEditModal();
}

// 关闭模态框
function closeEditModal() {
    editModal.style.display = 'none';
    currentEditingBookmarkId = null;
    editTitleInput.value = '';
    editUrlInput.value = '';
}

// --- 7. 注册模态框事件 ---

// 点击 X 按钮关闭
closeBtn.addEventListener('click', closeEditModal);

// 点击“取消”按钮关闭
cancelEditBtn.addEventListener('click', closeEditModal);

// 点击“保存”按钮保存
saveEditBtn.addEventListener('click', saveBookmark);

// 点击模态框背景关闭
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// 初始化渲染
render();