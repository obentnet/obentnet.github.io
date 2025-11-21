// RSS 地址
const RSS_URL = 'https://uegee.com/rss.xml';
// DOM 元素
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const postsContainer = document.getElementById('posts-container');
// 初始化
fetchRSS();
/**
 * 获取并解析 RSS 内容
 */
async function fetchRSS() {
    try {
        // 由于浏览器跨域限制，使用 CORS 代理
        // 这里使用了公开的 CORS 代理服务，生产环境建议使用自己的代理
        const proxyUrl = '';
        const response = await fetch(proxyUrl + RSS_URL, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status}`);
        }
        // 获取 XML 文本内容
        const xmlText = await response.text();               
        // 解析 XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');               
        // 检查解析错误
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('RSS 解析失败，格式不正确');
        }
        // 提取文章项
        const items = xmlDoc.querySelectorAll('item');                
        if (items.length === 0) {
            throw new Error('未找到任何文章');
        }
        // 渲染文章列表
        renderPosts(items);
    } catch (error) {
        // 显示错误信息
        loadingElement.style.display = 'none';
        errorElement.style.display = 'block';
        errorElement.textContent = `哎呀，文章飞走力!! (${error.message})`;
        console.error('RSS 加载错误:', error);
    }
}
/**
 * 渲染文章到页面
 * @param {NodeList} items - RSS 中的 item 节点列表
 */
function renderPosts(items) {
    // 清空容器
    postsContainer.innerHTML = '';
    // 遍历所有文章项
    items.forEach(item => {
        // 提取文章信息
        const title = item.querySelector('title')?.textContent || '无标题';
        const link = item.querySelector('link')?.textContent || '#';
        const pubDate = item.querySelector('pubDate')?.textContent || '未知时间';
        const description = item.querySelector('description')?.textContent || '无描述';
        // 创建文章元素
        const postElement = document.createElement('div');
        postElement.className = 'post';        
        // 构建文章 HTML
        postElement.innerHTML = `
            <article>
                <span class="post-title">
                    <a href="${escapeHtml(link)}" target="_blank" class="post-link">${escapeHtml(title)}</a>
                </span>
                <br>
                <span class="post-time">${formatDate(escapeHtml(pubDate))}</span>
                <br>
                <span class="post-content">${escapeHtml(description)}</span>
            </article>
        `;
        // 添加到容器
        postsContainer.appendChild(postElement);
    });
    // 显示文章列表，隐藏加载状态
    loadingElement.style.display = 'none';
    postsContainer.style.display = 'grid';
}
/**
 * HTML 转义，防止 XSS 攻击
 * @param {string} html - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(html) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
/**
 * 格式化日期显示
 * @param {string} dateString - RSS 中的日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        // 格式化：年-月-日 时:分:秒
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        // 日期格式解析失败时，返回原始字符串
        return dateString;
    }
}