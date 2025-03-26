console.log('[DinBenDon Helper] load content.js');

// 全局狀態
let orderInfo = null;
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
  const toggle = document.createElement('button');
  toggle.className = 'btn';
  toggle.style.cssText = `
    position: fixed;
    bottom: 5%;
    right: 0;
    z-index: 9999;
    padding: 5px 10px;
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    font-size: 14px;
    color: white;
    transition: transform 0.3s ease;
    transform: translateX(calc(100% - 10px));
    white-space: nowrap;
  `;
  toggle.textContent = extensionState.isEnabled ? '點擊停用插件' : '點擊啟用插件';
  toggle.style.backgroundColor = extensionState.isEnabled ? '#dc3545' : '#28a745';
  
  // 滑鼠移入時顯示完整按鈕
  toggle.addEventListener('mouseenter', () => {
    toggle.style.transform = 'translateX(0)';
  });
  
  // 滑鼠移出時隱藏按鈕
  toggle.addEventListener('mouseleave', () => {
    toggle.style.transform = 'translateX(calc(100% - 10px))';
  });

  toggle.addEventListener('click', () => {
    const newState = !extensionState.isEnabled;
    toggle.textContent = newState ? '點擊停用插件' : '點擊啟用插件';
    toggle.style.backgroundColor = newState ? '#dc3545' : '#28a745';
    updateExtensionState(newState);
    location.reload();
  });
  
  document.body.appendChild(toggle);
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

function updateOrderPaymentInfo(orderId, buyer, isPaid) {
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

  // 更新買家的付款狀態
  buyerOrderInfo.buyers[buyer] = isPaid;

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

  const originalTable = activeTable.querySelector('table.merge-table');
  if (!originalTable) return;

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
      const moneyCell = row.children[2];
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
      const buyerPaidStatus = currentOrderInfo?.buyers[buyer] || false;

      // 如果付款狀態不符合，移動到對應的表格
      if (buyerPaidStatus !== isPaid) {
        moveRowToCorrectTable(row, buyer, buyerPaidStatus ? paidTable : unpaidTable);
        return;
      }

      // 更新初始狀態
      updateOrderPaymentInfo(orderId, buyer, buyerPaidStatus);

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
    const currentPaid = currentOrderInfo?.buyers[buyer] || false;
    const newPaid = !currentPaid;

    // 更新儲存的狀態
    updateOrderPaymentInfo(orderId, buyer, newPaid);

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