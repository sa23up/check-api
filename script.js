document.addEventListener('DOMContentLoaded', () => {
    const apiKeysTextarea = document.getElementById('apiKeys');
    const checkKeysBtn = document.getElementById('checkKeysBtn');
    const resultsDiv = document.getElementById('results');
    const providerSelect = document.getElementById('providerSelect');

    checkKeysBtn.addEventListener('click', async () => {
        const keys = apiKeysTextarea.value.trim().split('\n').filter(key => key.length > 0);
        const provider = providerSelect.value;
        if (keys.length === 0) {
            alert('请输入至少一个 API 密钥。');
            return;
        }

        resultsDiv.innerHTML = '';
        checkKeysBtn.disabled = true;
        checkKeysBtn.textContent = '检测中...';

        // 为每个密钥显示“检测中”状态
        keys.forEach(key => {
            const keyPrefix = key.substring(0, 8) + '...';
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.id = `result-${key}`;
            resultItem.innerHTML = `
                <span class="key-prefix">${keyPrefix}</span>
                <span class="status checking">检测中...</span>
            `;
            resultsDiv.appendChild(resultItem);
        });

        try {
            // 调用我们部署在 Cloudflare Pages 上的函数。
            // `functions/check.js` 会被自动部署到 `/check` 路由。
            const response = await fetch('/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ keys, provider }),
            });

            if (!response.ok) {
                throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
            }

            const results = await response.json();
            
            // 更新每个密钥的最终状态
            results.forEach(result => {
                const resultItem = document.getElementById(`result-${result.key}`);
                if (resultItem) {
                    const statusSpan = resultItem.querySelector('.status');
                    statusSpan.textContent = result.isValid ? '有效' : '无效';
                    statusSpan.classList.remove('checking');
                    statusSpan.classList.add(result.isValid ? 'valid' : 'invalid');
                }
            });

        } catch (error) {
            console.error('检测失败:', error);
            resultsDiv.innerHTML = `<p style="color: #ea4335;">检测请求失败。请检查浏览器控制台获取更多信息。</p>`;
        } finally {
            checkKeysBtn.disabled = false;
            checkKeysBtn.textContent = '开始检测';
        }
    });
});