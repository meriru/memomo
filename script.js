let selectedKey = null;
let autosaveTimeout = null;

function loadMemoList(filter = '') {
  const memoList = document.getElementById('memoList');
  memoList.innerHTML = '';
  const keys = Object.keys(localStorage).filter(k => k.startsWith('memo_'));
  keys.sort((a, b) => {
    const aObj = JSON.parse(localStorage.getItem(a));
    const bObj = JSON.parse(localStorage.getItem(b));
    return new Date(bObj.updatedAt) - new Date(aObj.updatedAt);
  });

  for (const key of keys) {
    const memo = JSON.parse(localStorage.getItem(key));
    const text = (memo.title + memo.content + (memo.tags || [])).toLowerCase();
    if (filter && !text.includes(filter.toLowerCase())) continue;

    const li = document.createElement('li');
    li.classList.add('memo-entry');

    const title = document.createElement('span');
    title.textContent = memo.title || '(無題)';
    title.className = 'memo-title';
    title.onclick = () => {
      loadMemo(key);
      if (window.innerWidth <= 600) showEdit(); // モバイルなら編集へ自動切替
    };

    const renameBtn = document.createElement('button');
    renameBtn.textContent = '✏️';
    renameBtn.title = 'タイトル変更';
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      const newTitle = prompt('新しいタイトルを入力：', memo.title);
      if (newTitle !== null && newTitle.trim()) {
        memo.title = newTitle.trim();
        memo.updatedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(memo));
        loadMemoList();
      }
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = '削除';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('本当に削除しますか？')) {
        localStorage.removeItem(key);
        loadMemoList();
        clearEditor();
      }
    };

    li.appendChild(title);
    li.appendChild(renameBtn);
    li.appendChild(deleteBtn);
    memoList.appendChild(li);
  }
}

function getMemoInput() {
  return {
    title: document.getElementById('titleInput').value.trim(),
    content: document.getElementById('contentInput').value.trim(),
    tags: document.getElementById('tagInput').value.trim()
      .split(',').map(t => t.trim()).filter(t => t)
  };
}

function saveMemo(isAutoSave = false) {
  const { title, content, tags } = getMemoInput();

  if (!title && !content && !isAutoSave) {
    alert('空のメモは保存できません');
    return;
  }

  // ⚠ 自動保存時は未選択メモ（新規）には保存しない
  if (!selectedKey && isAutoSave) {
    return;
  }

  const key = selectedKey || `memo_${Date.now()}`;
  const memo = {
    title,
    content,
    tags,
    createdAt: selectedKey ? JSON.parse(localStorage.getItem(key)).createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(key, JSON.stringify(memo));

  if (!isAutoSave) {
    selectedKey = null;
    clearEditor();
    loadMemoList();
    alert('保存しました！');
    if (window.innerWidth <= 600) showList();
  } else {
    showAutoSaveMsg('自動保存しました');
    loadMemoList();
  }
}

function loadMemo(key) {
  const memo = JSON.parse(localStorage.getItem(key));
  selectedKey = key;
  document.getElementById('titleInput').value = memo.title;
  document.getElementById('contentInput').value = memo.content;
  document.getElementById('tagInput').value = (memo.tags || []).join(', ');
  document.getElementById('timestamp').textContent =
    `作成: ${new Date(memo.createdAt).toLocaleString()} / 更新: ${new Date(memo.updatedAt).toLocaleString()}`;
  clearAutoSaveMsg();
}

function deleteMemo() {
  if (!selectedKey) {
    alert('削除対象のメモを選択してください');
    return;
  }
  if (confirm('本当に削除しますか？')) {
    localStorage.removeItem(selectedKey);
    selectedKey = null;
    clearEditor();
    loadMemoList();
  }
}

function clearEditor() {
  document.getElementById('titleInput').value = '';
  document.getElementById('contentInput').value = '';
  document.getElementById('tagInput').value = '';
  document.getElementById('timestamp').textContent = '';
  clearAutoSaveMsg();

  selectedKey = null;

  // ✅ スマホなら編集画面に切替え
  if (window.innerWidth <= 600) showEdit();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
}

function downloadZip() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('memo_'));
  if (keys.length === 0) return alert('メモがありません');

  const zip = new JSZip();
  keys.forEach(key => {
    const memo = JSON.parse(localStorage.getItem(key));
    const title = memo.title.replace(/[\\/:*?"<>|]/g, '_') || 'untitled';
    const text = memo.content || '';
    zip.file(`${title}.txt`, text);
  });

  zip.generateAsync({ type: 'blob' }).then(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'memos_txt_only.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

// --- AutoSave 実装 ---
['titleInput', 'tagInput', 'contentInput'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(() => {
      saveMemo(true);
    }, 1000); // 1秒入力停止で自動保存
  });
});

function showAutoSaveMsg(msg) {
  const msgDiv = document.getElementById('autosave-msg');
  msgDiv.textContent = msg;
  setTimeout(clearAutoSaveMsg, 1500);
}
function clearAutoSaveMsg() {
  document.getElementById('autosave-msg').textContent = '';
}

window.onload = () => {
  document.getElementById('searchInput').addEventListener('input', e => {
    loadMemoList(e.target.value);
  });
  loadMemoList();
};

// モバイル用切り替えボタン処理
const btnList = document.getElementById('btnList');
const btnEdit = document.getElementById('btnEdit');
const sidebar = document.getElementById('sidebar');
const editor = document.getElementById('editor');

function showList() {
  sidebar.classList.add('show');
  editor.classList.remove('show');
  btnList.classList.add('active');
  btnEdit.classList.remove('active');
}
function showEdit() {
  sidebar.classList.remove('show');
  editor.classList.add('show');
  btnList.classList.remove('active');
  btnEdit.classList.add('active');
}

// 初期表示（縦画面用のみ）
if (window.innerWidth <= 600) {
  showEdit();
}

btnList.addEventListener('click', showList);
btnEdit.addEventListener('click', showEdit);
