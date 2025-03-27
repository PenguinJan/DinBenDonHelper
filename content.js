console.log('[DinBenDon Helper] load content.js');

// 全局狀態
let orderInfo = null;
let originalTable = null; // 添加全局變數以供其他函數使用
const STORAGE_KEYS = {
  ORDER_INFO: 'DinBenDan-Ext-Info',
  EXTENSION_STATE: 'DinBenDan-Ext-Enabled'
};

// ==== 主要入口 ====
function init() {
  console.log('Dinbendon Helper init');

  // 初始化儲存和取得設定狀態
  initOrderStore();
  const extensionState = getExtensionState();

  // 新增 UI 開關
  addExtensionToggleButton(extensionState);

  // 如果插件未啟用，不執行後續功能
  if (!extensionState.isEnabled) {
    console.log('[DinBenDan Helper] Extension is disabled');
    return;
  }

  // 切換到上次的 tab
  if (orderInfo && orderInfo.activeTableId) {
    console.log('[DinBenDan Helper] switchToTab', orderInfo.activeTableId);
    switchToTab(orderInfo.activeTableId);
  }

  // 監聽頁籤變更
  setupTabChangeListener();
}

// ==== 擴充功能啟用狀態管理 ====
function getExtensionState() {
  const store = localStorage.getItem(STORAGE_KEYS.EXTENSION_STATE);
  return store ? JSON.parse(store) : { isEnabled: true };
}

function updateExtensionState(isEnabled) {
  const store = getExtensionState();
  store.isEnabled = isEnabled;
  localStorage.setItem(STORAGE_KEYS.EXTENSION_STATE, JSON.stringify(store));
}

function addExtensionToggleButton(extensionState) {
  // 創建按鈕容器
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    position: fixed;
    bottom: 5%;
    right: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 5px;
  `;

  // 創建啟用/停用按鈕
  const toggle = document.createElement('button');
  toggle.className = 'btn';
  toggle.style.cssText = `
    padding: 5px 10px;
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    font-size: 14px;
    color: white;
    transition: transform 0.3s ease;
    white-space: nowrap;
    ${extensionState.isEnabled ? 'transform: translateX(calc(100% - 10px));' : 'transform: translateX(0);'}
  `;
  toggle.textContent = extensionState.isEnabled ? '點擊停用插件' : '點擊啟用插件';
  toggle.style.backgroundColor = extensionState.isEnabled ? '#dc3545' : '#28a745';
  
  // 只在啟用狀態時添加滑鼠移入/移出效果
  if (extensionState.isEnabled) {
    // 滑鼠移入時顯示完整按鈕
    toggle.addEventListener('mouseenter', () => {
      toggle.style.transform = 'translateX(0)';
    });
    
    // 滑鼠移出時隱藏按鈕
    toggle.addEventListener('mouseleave', () => {
      toggle.style.transform = 'translateX(calc(100% - 10px))';
    });
  }

  toggle.addEventListener('click', () => {
    const newState = !extensionState.isEnabled;
    toggle.textContent = newState ? '點擊停用插件' : '點擊啟用插件';
    toggle.style.backgroundColor = newState ? '#dc3545' : '#28a745';
    updateExtensionState(newState);
    location.reload();
  });

  // 將啟用/停用按鈕加入容器
  buttonContainer.appendChild(toggle);

  // 只在插件啟用狀態時添加完整清除資料按鈕
  if (extensionState.isEnabled) {
    // 創建完整清除資料按鈕
    const clearAllButton = document.createElement('button');
    clearAllButton.className = 'btn';
    clearAllButton.style.cssText = `
      padding: 5px 10px;
      border-radius: 4px 0 0 4px;
      cursor: pointer;
      font-size: 14px;
      color: white;
      transition: transform 0.3s ease;
      transform: translateX(calc(100% - 10px));
      white-space: nowrap;
      background-color: #ff6b6b;
    `;
    clearAllButton.textContent = '完整清除資料';
    
    // 滑鼠移入時顯示完整按鈕
    clearAllButton.addEventListener('mouseenter', () => {
      clearAllButton.style.transform = 'translateX(0)';
    });
    
    // 滑鼠移出時隱藏按鈕
    clearAllButton.addEventListener('mouseleave', () => {
      clearAllButton.style.transform = 'translateX(calc(100% - 10px))';
    });

    // 完整清除資料按鈕點擊事件
    clearAllButton.addEventListener('click', () => {
      if (confirm('確定要完整清除所有資料嗎？此操作無法復原。')) {
        // 清除所有相關的 localStorage 資料
        localStorage.removeItem(STORAGE_KEYS.ORDER_INFO);
        localStorage.removeItem(STORAGE_KEYS.EXTENSION_STATE);
        alert('所有資料已清除，頁面將重新載入。');
        location.reload();
      }
    });
    
    // 將完整清除資料按鈕加入容器
    buttonContainer.appendChild(clearAllButton);
  }
  
  // 將按鈕容器加入頁面
  document.body.appendChild(buttonContainer);
}

// ==== 數據存儲管理 ====
function getOrderId() {
  return new URLSearchParams(location.search).get('id');
}

function getDateString() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function createNewOrderInfo() {
  return {
    date: getDateString(),
    order_infos: [],
    activeTableId: 'by-buyer-tab'  // 預設值
  };
}

function initOrderStore() {
  const orderId = getOrderId();
  if (!orderId) return;

  console.log('[DinBenDan Helper] initOrderStore', orderId);
  const storedData = localStorage.getItem(STORAGE_KEYS.ORDER_INFO);
  
  if (!storedData) {
    console.log('Not found store for order', orderId);
    orderInfo = createNewOrderInfo();
    localStorage.setItem(STORAGE_KEYS.ORDER_INFO, JSON.stringify(orderInfo));
    return;
  }
  
  const parsedInfo = JSON.parse(storedData);
  if (parsedInfo.date !== getDateString()) {
    console.log('Date not match', parsedInfo.date, getDateString());
    orderInfo = createNewOrderInfo();
    localStorage.setItem(STORAGE_KEYS.ORDER_INFO, JSON.stringify(orderInfo));
  } else {
    console.log('Date match', parsedInfo.date, getDateString());
    orderInfo = parsedInfo;
  }
}

function updateOrderPaymentInfo(orderId, buyer, isPaid, noChangeGiven = 0) {
  if (!orderId) return;

  // 確保訂單資訊物件存在
  if (!orderInfo.order_infos) {
    orderInfo.order_infos = [];
  }

  // 尋找或創建買家的訂單資訊
  let buyerOrderInfo = orderInfo.order_infos.find(o => o.order_id === orderId);
  if (!buyerOrderInfo) {
    buyerOrderInfo = {
      order_id: orderId,
      buyers: {}
    };
    orderInfo.order_infos.push(buyerOrderInfo);
  }

  // 更新買家的付款狀態和找錢狀態
  if (isPaid) {
    buyerOrderInfo.buyers[buyer] = {
      paid: true,
      noChangeGiven: noChangeGiven
    };
  } else {
    buyerOrderInfo.buyers[buyer] = false;
  }

  // 儲存到 localStorage
  localStorage.setItem(STORAGE_KEYS.ORDER_INFO, JSON.stringify(orderInfo));
}

// ==== 頁籤管理 ====
function getActiveTable() {
  const panels = document.getElementsByClassName('tabs-component-panels')[0];
  if (!panels) return null;
  return panels.children[0];
}

function switchToTab(tabId) {
  const tabs_li = document.querySelectorAll('.tabs-component-tab');
  console.log('[DinBenDan Helper] switchToTab', tabs_li);
  
  const targetTab = Array.from(tabs_li).find(li => 
    li.children[0].getAttribute('aria-controls') === tabId
  );
  
  if (targetTab) {
    targetTab.children[0].click();
  }
}

function setupTabChangeListener() {
  const observer = new MutationObserver((mutations) => {
    handleActiveTableChange(mutations);
  });

  const tabComponentPanels = document.getElementsByClassName('tabs-component-panels')[0];
  if (tabComponentPanels) {
    observer.observe(tabComponentPanels, { childList: true });
    handleActiveTableChange(false);
  }
}

function handleActiveTableChange(saveTab = true) {
  const activeTable = getActiveTable();
  if (!activeTable) return;

  console.log('activeTable', activeTable.id);

  // 更新 store 中的 activeTableId
  if (orderInfo && saveTab) {
    orderInfo.activeTableId = activeTable.id;
    localStorage.setItem(STORAGE_KEYS.ORDER_INFO, JSON.stringify(orderInfo));
  }

  if (activeTable.id === 'by-buyer-tab') {
    // 建立一個新的 observer 來監聽 merge-table 的掛載
    const tableObserver = new MutationObserver((mutations, observer) => {
      const mergeTable = activeTable.querySelector('table.merge-table');
      if (mergeTable) {
        // 找到 merge-table 後，停止觀察並執行 setup
        observer.disconnect();
        setupOrderManagement();
      }
    });

    // 開始觀察 activeTable 的子元素變化
    tableObserver.observe(activeTable, {
      childList: true,
      subtree: true
    });
  }
}

// ==== 訂單管理功能 ====
function setupOrderManagement() {
  const activeTable = getActiveTable();
  if (!activeTable) return;

  const orgTable = activeTable.querySelector('table.merge-table');
  if (!orgTable) return;
  
  // 保存為全局變數
  originalTable = orgTable;

  // 初始化訂單資訊
  initOrderStore();

  // 建立 UI 組件
  const { 
    filterContainer, 
    filterInput, 
    totalAmountValue, 
    clearButton 
  } = createFilterUI();

  // 插入篩選器到表格前面
  originalTable.parentNode.insertBefore(filterContainer, originalTable);

  // 建立已繳費和未繳費的表格
  const { 
    tablesContainer, 
    paidTable, 
    unpaidTable 
  } = createPaymentTables(originalTable);

  // 替換原始表格
  originalTable.parentNode.replaceChild(tablesContainer, originalTable);

  // 設定清除按鈕功能
  setupClearButton(clearButton);

  // 處理表格數據和互動
  setupTableInteractions(paidTable, unpaidTable, filterInput, totalAmountValue);
}

function createFilterUI() {
  // 新增篩選器容器
  const filterContainer = document.createElement('div');
  filterContainer.className = 'mb-3';
  filterContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  `;

  // 新增篩選器標籤
  const filterLabel = document.createElement('label');
  filterLabel.textContent = '訂購人篩選：';
  filterLabel.className = 'mb-0';

  // 新增篩選器輸入框
  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.className = 'form-control';
  filterInput.placeholder = '輸入訂購人姓名';
  filterInput.value = '市場';
  filterInput.style.cssText = `
    max-width: 200px;
    display: inline-block;
  `;

  // 新增清除按鈕
  const clearButton = document.createElement('button');
  clearButton.className = 'btn btn-danger';
  clearButton.textContent = '清除付款狀態';
  clearButton.style.cssText = `
    margin-left: 10px;
    background-color: #64ea5d4b;
  `;

  // 新增總計金額顯示
  const totalAmountContainer = document.createElement('div');
  totalAmountContainer.className = 'ml-3';
  totalAmountContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const totalAmountLabel = document.createElement('label');
  totalAmountLabel.textContent = '總計金額：';
  totalAmountLabel.className = 'mb-0';

  const totalAmountValue = document.createElement('span');
  totalAmountValue.className = 'font-weight-bold';
  totalAmountValue.style.color = '#dc3545';

  totalAmountContainer.appendChild(totalAmountLabel);
  totalAmountContainer.appendChild(totalAmountValue);

  // 將篩選器元素加入容器
  filterContainer.appendChild(filterLabel);
  filterContainer.appendChild(filterInput);
  filterContainer.appendChild(clearButton);
  filterContainer.appendChild(totalAmountContainer);

  return { 
    filterContainer, 
    filterInput, 
    totalAmountValue, 
    clearButton 
  };
}

function createPaymentTables(originalTable) {
  // 建立已繳費和未繳費的表格容器
  const tablesContainer = document.createElement('div');
  tablesContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;

  // 建立已繳費表格
  const paidTableContainer = document.createElement('div');
  const paidTableTitle = document.createElement('h4');
  paidTableTitle.textContent = '已繳費訂單';
  paidTableTitle.className = 'mb-3';
  const paidTable = originalTable.cloneNode(true);
  
  // 在已繳費表格中添加未找錢的標頭欄位
  const paidTableHeader = paidTable.querySelector('thead tr');
  if (paidTableHeader) {
    const noChangeHeader = document.createElement('th');
    noChangeHeader.textContent = '未找錢';
    noChangeHeader.className = 'text-center';
    noChangeHeader.style.cssText = `
      width: 100px;
      background-color: #D0FAC0;
    `;
    // 在表頭首位插入未找錢欄位
    paidTableHeader.insertBefore(noChangeHeader, paidTableHeader.firstChild);
  }
  
  paidTableContainer.appendChild(paidTableTitle);
  paidTableContainer.appendChild(paidTable);

  // 建立未繳費表格
  const unpaidTableContainer = document.createElement('div');
  const unpaidTableTitle = document.createElement('h4');
  unpaidTableTitle.textContent = '未繳費訂單';
  unpaidTableTitle.className = 'mb-3';
  const unpaidTable = originalTable.cloneNode(true);
  unpaidTableContainer.appendChild(unpaidTableTitle);
  unpaidTableContainer.appendChild(unpaidTable);

  // 將兩個表格加入容器
  tablesContainer.appendChild(unpaidTableContainer);
  tablesContainer.appendChild(paidTableContainer);

  return { tablesContainer, paidTable, unpaidTable };
}

function setupClearButton(clearButton) {
  clearButton.addEventListener('click', () => {
    const orderId = getOrderId();
    if (!orderId) return;

    // 從 orderInfo 中移除該訂單的資訊
    orderInfo.order_infos = orderInfo.order_infos.filter(o => o.order_id !== orderId);

    // 儲存更新後的資訊
    localStorage.setItem(STORAGE_KEYS.ORDER_INFO, JSON.stringify(orderInfo));

    // 重新整理頁面以套用新的狀態
    location.reload();
  });
}

function setupTableInteractions(paidTable, unpaidTable, filterInput, totalAmountValue) {
  // 計算總金額的函數
  const calculateTotalAmount = () => {
    const paidRows = paidTable.querySelectorAll('tbody tr');
    let paidTotal = 0;
    
    paidRows.forEach(row => {
      if (row.style.display === 'none') return;
      const moneyCell = row.querySelector('td:nth-child(4)');
      if (moneyCell) {
        paidTotal += parseInt(moneyCell.textContent) || 0;
      }
    });
    
    return paidTotal;
  };

  // 更新總金額顯示
  const updateTotalAmount = () => {
    const total = calculateTotalAmount();
    totalAmountValue.textContent = `${total} 元`;
  };

  // 篩選功能
  const handleFilter = (searchText) => {
    const paidRows = paidTable.querySelectorAll('tbody tr');
    const unpaidRows = unpaidTable.querySelectorAll('tbody tr');

    [...paidRows, ...unpaidRows].forEach(row => {
      const buyerCell = row.querySelector('.merged-key');
      if (!buyerCell) return;

      const buyerName = buyerCell.textContent.toLowerCase();
      row.style.display = buyerName.includes(searchText.toLowerCase()) ? '' : 'none';
    });
    
    updateTotalAmount();
  };

  filterInput.addEventListener('input', (e) => {
    handleFilter(e.target.value);
  });

  // 立即執行初始篩選
  handleFilter(filterInput.value);

  // 處理表格行
  const processTableRows = (table, isPaid) => {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const buyerCell = row.querySelector('.merged-key');
      if (!buyerCell) return;

      const buyer = buyerCell.textContent;
      const orderId = getOrderId();

      // 檢查是否已付款（使用儲存的狀態）
      const currentOrderInfo = orderInfo.order_infos.find(o => o.order_id === orderId);
      let buyerPaidStatus = false;
      let noChangeGiven = false;

      // 如果有訂單資訊，取得付款狀態和找錢狀態
      if (currentOrderInfo && currentOrderInfo.buyers[buyer]) {
        if (typeof currentOrderInfo.buyers[buyer] === 'object') {
          buyerPaidStatus = currentOrderInfo.buyers[buyer].paid || false;
          noChangeGiven = currentOrderInfo.buyers[buyer].noChangeGiven || 0;
        } else {
          buyerPaidStatus = currentOrderInfo.buyers[buyer];
        }
      }

      // 如果是已付款表格，添加未找錢標記
      if (isPaid && table === paidTable) {
        const noChangeCell = document.createElement('td');
        noChangeCell.className = 'text-center';
        
        // 創建輸入框容器
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group input-group-sm';
        inputGroup.style.cssText = `
          width: 80px;
          margin: 0 auto;
        `;
        
        // 創建輸入框
        const noChangeInput = document.createElement('input');
        noChangeInput.type = 'number';
        noChangeInput.className = 'form-control';
        noChangeInput.style.cssText = `
          background-color: #f8f9fa;
          text-align: center;
          min-width: 60px;
          font-size: 14px;
        `;
        noChangeInput.value = noChangeGiven || 0;
        noChangeInput.min = 0;
        
        // 輸入框變更事件
        noChangeInput.addEventListener('change', (e) => {
          e.stopPropagation(); // 防止觸發整行的點擊事件
          const newAmount = parseInt(e.target.value) || 0;
          
          // 更新存儲的未找錢數量
          updateOrderPaymentInfo(orderId, buyer, true, newAmount);
          
          // 更新輸入框樣式
          if (newAmount > 0) {
            // noChangeInput.style.backgroundColor = '#ffcc00';
            noChangeInput.style.fontWeight = 'bold';
          } else {
            // noChangeInput.style.backgroundColor = '#f8f9fa';
            noChangeInput.style.fontWeight = 'normal';
          }
        });
        
        // 設置初始樣式
        if (noChangeGiven > 0) {
          noChangeInput.style.fontWeight = 'bold';
        }
        
        // 防止點擊輸入框時觸發行點擊事件
        noChangeInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        
        inputGroup.appendChild(noChangeInput);
        noChangeCell.appendChild(inputGroup);
        // 在行的首位插入未找錢欄位
        row.insertBefore(noChangeCell, row.firstChild);
      }

      // 如果付款狀態不符合，移動到對應的表格
      if (buyerPaidStatus !== isPaid) {
        moveRowToCorrectTable(row, buyer, buyerPaidStatus ? paidTable : unpaidTable);
        return;
      }

      // 更新初始狀態
      updateOrderPaymentInfo(orderId, buyer, buyerPaidStatus, noChangeGiven);

      // 設定行點擊事件
      setupRowClickHandler(row, buyer, orderId, paidTable, unpaidTable, updateTotalAmount);
    });
  };

  // 處理兩個表格
  processTableRows(paidTable, true);
  processTableRows(unpaidTable, false);
  
  updateTotalAmount();
}

function moveRowToCorrectTable(row, buyer, targetTable) {
  const targetTbody = targetTable.querySelector('tbody');
  
  // 檢查目標表格是否已經有相同的訂購人
  const existingRow = Array.from(targetTbody.querySelectorAll('tr')).find(
    tr => tr.querySelector('.merged-key')?.textContent === buyer
  );
  
  if (!existingRow) {
    // 檢查目標表格的表頭首欄是否為「未找錢」
    const isTargetTableHasNoChangeColumn = targetTable.querySelector('thead tr th:first-child')?.textContent === '未找錢';
    
    // 檢查行的首欄是否是未找錢欄位（通過檢查其中是否有數字輸入框）
    const hasNoChangeCell = row.querySelector('td:first-child input[type="number"]') !== null;
    
    // 如果移動到未繳費表格，且當前行有未找錢欄位，則移除該欄位
    if (!isTargetTableHasNoChangeColumn && hasNoChangeCell) {
      const firstCell = row.querySelector('td:first-child');
      if (firstCell) {
        row.removeChild(firstCell);
      }
    }
    // 如果移動到已繳費表格，且當前行沒有未找錢欄位，則添加該欄位
    else if (isTargetTableHasNoChangeColumn && !hasNoChangeCell) {
      const orderId = getOrderId();
      const currentOrderInfo = orderInfo.order_infos.find(o => o.order_id === orderId);
      let noChangeGiven = 0;
      
      // 檢查是否有未找錢的狀態
      if (currentOrderInfo && currentOrderInfo.buyers[buyer] && 
          typeof currentOrderInfo.buyers[buyer] === 'object') {
        noChangeGiven = currentOrderInfo.buyers[buyer].noChangeGiven || 0;
      }
      
      // 創建未找錢欄位
      const noChangeCell = document.createElement('td');
      noChangeCell.className = 'text-center';
      
      // 創建輸入框容器
      const inputGroup = document.createElement('div');
      inputGroup.className = 'input-group input-group-sm';
      inputGroup.style.cssText = `
        width: 80px;
        margin: 0 auto;
      `;
      
      // 創建輸入框
      const noChangeInput = document.createElement('input');
      noChangeInput.type = 'number';
      noChangeInput.className = 'form-control';
      noChangeInput.style.cssText = `
        text-align: center;
        min-width: 60px;
        font-size: 14px;
      `;
      noChangeInput.value = noChangeGiven;
      noChangeInput.min = 0;
      
      // 輸入框變更事件
      noChangeInput.addEventListener('change', (e) => {
        e.stopPropagation();
        const newAmount = parseInt(e.target.value) || 0;
        
        // 更新存儲的未找錢數量
        updateOrderPaymentInfo(orderId, buyer, true, newAmount);
        
        // 更新輸入框樣式
        if (newAmount > 0) {
          noChangeInput.style.backgroundColor = '#ffcc00';
          noChangeInput.style.fontWeight = 'bold';
        } else {
          noChangeInput.style.backgroundColor = '#f8f9fa';
          noChangeInput.style.fontWeight = 'normal';
        }
      });
      
      // 設置初始樣式
      if (noChangeGiven > 0) {
        noChangeInput.style.backgroundColor = '#ffcc00';
        noChangeInput.style.fontWeight = 'bold';
      }
      
      // 防止點擊輸入框時觸發行點擊事件
      noChangeInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      inputGroup.appendChild(noChangeInput);
      noChangeCell.appendChild(inputGroup);
      // 在行的首位插入未找錢欄位
      row.insertBefore(noChangeCell, row.firstChild);
    }
    
    targetTbody.appendChild(row);
  } else {
    // 如果已經存在，則移除當前行
    row.remove();
  }
}

function setupRowClickHandler(row, buyer, orderId, paidTable, unpaidTable, updateTotalAmount) {
  // 加入游標樣式
  row.style.cursor = 'pointer';
  
  // 加入點擊事件
  row.addEventListener('click', (e) => {
    // 如果點擊的是連結或按鈕，不觸發狀態切換
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

    // 取得目前狀態並切換
    const currentOrderInfo = orderInfo.order_infos.find(o => o.order_id === orderId);
    let currentPaid = false;
    let noChangeGiven = false;

    // 解析當前狀態
    if (currentOrderInfo && currentOrderInfo.buyers[buyer]) {
      if (typeof currentOrderInfo.buyers[buyer] === 'object') {
        currentPaid = currentOrderInfo.buyers[buyer].paid || false;
        noChangeGiven = currentOrderInfo.buyers[buyer].noChangeGiven || 0;
      } else {
        currentPaid = currentOrderInfo.buyers[buyer];
      }
    }

    const newPaid = !currentPaid;

    // 更新儲存的狀態
    updateOrderPaymentInfo(orderId, buyer, newPaid, newPaid ? noChangeGiven : 0);

    // 移動行到對應的表格
    const targetTable = newPaid ? paidTable : unpaidTable;
    moveRowToCorrectTable(row, buyer, targetTable);

    // 更新總金額
    updateTotalAmount();
  });
}

// ==== 初始化觸發 ====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}