  function initGeminiAiSummary() {
    const parseCodeString = (content, needEscape) => {
      const replaceEscapeString = needEscape
        ? content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
        : content;

      const codeSymbol = /`(.*?)`/g;
      return replaceEscapeString.replace(codeSymbol, '<code>$1</code>');
    };

    const geminiAiTextQueue = [];
    const geminiAiTextLimit = () => Math.max(Math.round(Math.random() * 3), 1);

    const fakeAiTypedInput = async (text, element) => {
      return new Promise(async (resolve) => {
        if (text.length) {
          geminiAiTextQueue.push(text);
        }
        if (geminiAiTextQueue.length === 0) {
          resolve();
          return;
        }
        const paragraph = geminiAiTextQueue.shift();

        const typeIn = async (textContent, index = 0) => {
          if (!textContent.length || index >= textContent.length) {
            await new Promise((resolve) => {
              element.innerHTML = parseCodeString(element.innerHTML, false);
              setTimeout(resolve);
            });
            resolve();
            // fakeAiTypedInput('', element);
            return;
          }
          // element.textContent += String(textContent).charAt(index);
          const slicedContent = String(textContent).slice(index, index + geminiAiTextLimit());
          element.innerHTML += parseCodeString(slicedContent);

          setTimeout(() => {
            requestAnimationFrame(() => {
              typeIn(textContent, index + slicedContent.length);
            });
          }, 50);
        };
        typeIn(paragraph);
      });
    };

    let postAI = document.querySelector('.post-gemini-ai');
    let postTile = document.querySelector('.post-title')?.textContent;

    postAI.addEventListener('click', geminiAI);

    async function geminiAI() {
      postAI.insertAdjacentHTML(
        'afterend',
        '<div class="post-gemini-ai-result-wrap"> <div class="note primary no-icon flat"> <p class="post-gemini-ai-result"></p>  <span class="ai-typed-cursor">|</span></div> </div>',
      );
      postAI.classList.add('post-gemini-noclick');
      let GeminiFetch = 'https://googleaihexo.xn.fun/v1/chat/completions';
      try {
        let postAIResult = document.querySelector('.post-gemini-ai-result');
        let input = document.querySelector('.post-content').innerText;
        const postToc = document.querySelector('.toc-content');
        const updateTimeEl = document.querySelector('.post-meta-date-updated');
        const updateTime = Date.parse(updateTimeEl.getAttribute('datetime'));

        let inputContent = input
          .replace(/\n/g, '')
          .replace(/[ ]+/g, ' ')
          .replace(/<pre>[\s\S]*?<\/pre>/g, '')
          // max-token
          .substring(0, 30000);
        let toAI = `文章标题：${postTile}；文章目录：${postToc?.textContent}；具体内容：${inputContent}`;
        const res = await fetch(GeminiFetch, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: '*',
          },
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: "You are a highly skilled AI trained in language comprehension and summarization. I would like you to read the text delimited by triple quotes and summarize it into a concise abstract paragraph. Aim to retain the most important points, providing a coherent and readable summary that could help a person understand the main points of the discussion without needing to read the entire text. Please avoid unnecessary details or tangential points. Only give me the output and nothing else. Do not wrap responses in quotes. Respond in the Chinese language.",
              },
              { role: 'user', content: toAI },
            ],
            temperature: 0.7,
            stream: true,
            updateTime,
            title: postTile,
          }),
        });

        if (!res.ok) {
          // 抛出错误，以便在 catch 块中捕获
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const reader = res.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          const text = new TextDecoder().decode(value);
          const strList = text.split('\n').filter(Boolean);

          const str = strList.reduce((acc, currentValue) => {
            if (currentValue.includes('DONE')) {
              return acc;
            }
            const nextStr = JSON.parse(currentValue.substring(6))?.choices[0].delta.content;
            if (!nextStr) {
              return acc;
            }
            return `${acc}${nextStr}`;
          }, '');

          await fakeAiTypedInput(str, postAIResult);
        }
      } catch (error) {
        document.querySelector('.post-gemini-ai-result-wrap').remove();
        console.log(error);
      }
    }
  }

  initGeminiAiSummary();
