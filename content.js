console.log('[DinBenDon Helper] load content.js');

// 主要功能邏輯
function init() {
    console.log('Dinbendon Helper init');

    // 初始化 store
    initStore();

    // 取得插件啟用狀態
    const extensionStore = getExtensionStore();

    // 新增啟用開關按鈕
    const toggleButton = document.createElement('button');
    toggleButton.className = 'btn';
    toggleButton.style.cssText = `
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
    toggleButton.textContent = extensionStore.isEnabled ? '點擊停用插件' : '點擊啟用插件';
    toggleButton.style.backgroundColor = extensionStore.isEnabled ? '#dc3545' : '#28a745';
    
    // 滑鼠移入時顯示完整按鈕
    toggleButton.addEventListener('mouseenter', () => {
        toggleButton.style.transform = 'translateX(0)';
    });
    
    // 滑鼠移出時隱藏按鈕
    toggleButton.addEventListener('mouseleave', () => {
        toggleButton.style.transform = 'translateX(calc(100% - 10px))';
    });

    toggleButton.addEventListener('click', () => {
        const newState = !extensionStore.isEnabled;
        toggleButton.textContent = newState ? '點擊停用插件' : '點擊啟用插件';
        toggleButton.style.backgroundColor = newState ? '#dc3545' : '#28a745';
        updateExtensionStore(newState);
        location.reload();
    });
    document.body.appendChild(toggleButton);

    // 如果插件未啟用，不執行後續功能
    if (!extensionStore.isEnabled) {
        console.log('[DinBenDan Helper] Extension is disabled');
        return;
    }

    // 切換到上次的 tab
    if (info && info.activeTableId) {
        console.log('[DinBenDan Helper] switchToTab', info.activeTableId);
        switchToTab(info.activeTableId);
    }

    // 監聽 activeTable 的變化
    const observer = new MutationObserver((mutations) => {
        handleActiveTableChange(mutations);
    });

    const tabComponentPanels = document.getElementsByClassName('tabs-component-panels')[0];
    observer.observe(tabComponentPanels, { childList: true });
    handleActiveTableChange(false);
}

function getActiveTable() {
    const panels = document.getElementsByClassName('tabs-component-panels')[0];
    if (!panels) return null;
    return panels.children[0];
}

function getOrderId() {
    return new URLSearchParams(location.search).get('id');
}

function getDateString() {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function initInfo() {
    const info = {
        date: getDateString(),
        order_infos: [],
        activeTableId: 'by-buyer-tab'  // 預設值
    };
    return info;
}
let info = null;
function initStore() {
    const orderId = getOrderId();
    if (!orderId) return;

    console.log('[DinBenDan Helper] initStore', orderId);
    const store = localStorage.getItem('DinBenDan-Ext-Info');
    if (!store) {
        console.log('not found store ', orderId);
        info = initInfo();
        localStorage.setItem('DinBenDan-Ext-Info', JSON.stringify(info));
        return;
    }
    const storeInfo = JSON.parse(store);
    if (storeInfo.date !== getDateString()) {
        console.log('date not match', storeInfo.date, getDateString());
        info = initInfo();
        localStorage.setItem('DinBenDan-Ext-Info', JSON.stringify(info));
    } else {
        console.log('date match', storeInfo.date, getDateString(), storeInfo);
        info = storeInfo;
    }
}

// 新增切換 tab 的函數
function switchToTab(tabId) {
    // tabId='by-buyer-tab'
    const tabs_li = document.querySelectorAll('.tabs-component-tab');
    console.log('[DinBenDan Helper] switchToTab', tabs_li);
    const targetTab = Array.from(tabs_li).find(li => li.children[0].getAttribute('aria-controls') === tabId);
    console.log('[DinBenDan Helper] switchToTab', targetTab.children[0].getAttribute('aria-controls'));

    if (targetTab) {
        targetTab.children[0].click();
    }
}

function handleActiveTableChange(saveTab = true) {
    const activeTable = getActiveTable();
    if (!activeTable) return;

    console.log('activeTable', activeTable.id);

    // 更新 store 中的 activeTableId
    if (info && saveTab) {
        info.activeTableId = activeTable.id;
        localStorage.setItem('DinBenDan-Ext-Info', JSON.stringify(info));
    }

    if (activeTable.id === 'by-buyer-tab') {
        // 建立一個新的 observer 來監聽 merge-table 的掛載
        const tableObserver = new MutationObserver((mutations, observer) => {
            const mergeTable = activeTable.querySelector('table.merge-table');
            if (mergeTable) {
                // 找到 merge-table 後，停止觀察並執行 setup
                observer.disconnect();
                startSetup();
            }
        });

        // 開始觀察 activeTable 的子元素變化
        tableObserver.observe(activeTable, {
            childList: true,
            subtree: true
        });
    }
}

function startSetup() {
    const activeTable = getActiveTable();
    if (!activeTable) return;

    const originalTable = activeTable.querySelector('table.merge-table');
    if (!originalTable) return;


    // 初始化訂單資訊
    initStore();

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
    clearButton.addEventListener('click', () => {
        const orderId = getOrderId();
        if (!orderId) return;

        // 從 info 中移除該訂單的資訊
        info.order_infos = info.order_infos.filter(o => o.order_id !== orderId);

        // 儲存更新後的資訊
        localStorage.setItem('DinBenDan-Ext-Info', JSON.stringify(info));

        // 重新整理頁面以套用新的狀態
        location.reload();
    });

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

    // 將篩選器插入到表格前面
    originalTable.parentNode.insertBefore(filterContainer, originalTable);

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

    // 替換原始表格
    originalTable.parentNode.replaceChild(tablesContainer, originalTable);

    // 計算總金額的函數
    const calculateTotalAmount = () => {
        const paidRows = paidTable.querySelectorAll('tbody tr');
        let paidTotal = 0;
        paidRows.forEach(row => {
            if (row.style.display == 'none') return;
            const amountCell = row.children[2];
            const [name, amount, money] = row.children;
            console.log(`[paidRows] (${name.textContent})  ${money.textContent}`);
            if (money) {
                paidTotal += parseInt(money.textContent) || 0;
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
    filterInput.addEventListener('input', (e) => {
        handleFilter(e.target.value);
        updateTotalAmount();
    });

    const handleFilter = (searchText) => {
        const paidRows = paidTable.querySelectorAll('tbody tr');
        const unpaidRows = unpaidTable.querySelectorAll('tbody tr');

        [...paidRows, ...unpaidRows].forEach(row => {
            const buyerCell = row.querySelector('.merged-key');
            if (!buyerCell) return;

            const buyerName = buyerCell.textContent.toLowerCase();
            row.style.display = buyerName.includes(searchText.toLowerCase()) ? '' : 'none';
        });
    };

    // 立即執行初始篩選
    handleFilter('市場');

    // 處理表格行
    const processTableRows = (table, isPaid) => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const buyerCell = row.querySelector('.merged-key');
            if (!buyerCell) return;

            const buyer = buyerCell.textContent;
            const orderId = getOrderId();

            // 檢查是否已付款（使用儲存的狀態）
            const orderInfo = info.order_infos.find(o => o.order_id === orderId);
            const rowIsPaid = orderInfo?.buyers[buyer] || false;

            // 如果付款狀態不符合，移動到對應的表格
            if (rowIsPaid !== isPaid) {
                const targetTable = isPaid ? unpaidTable : paidTable;
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
                return;
            }

            // 更新初始狀態
            updateOrderInfo(orderId, buyer, rowIsPaid);

            // 加入點擊事件
            row.addEventListener('click', (e) => {
                // 如果點擊的是連結或按鈕，不觸發狀態切換
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

                const currentPaid = orderInfo?.buyers[buyer] || false;
                const newPaid = !currentPaid;

                // // 切換付款狀態
                // if (newPaid) {
                //     row.querySelectorAll('.cell').forEach(cell => {
                //         cell.classList.add('done-cell');
                //     });
                // } else {
                //     row.querySelectorAll('.cell').forEach(cell => {
                //         cell.classList.remove('done-cell');
                //     });
                // }

                // 更新儲存的狀態
                updateOrderInfo(orderId, buyer, newPaid);

                // 移動行到對應的表格
                const currentTable = row.closest('table');
                const targetTable = newPaid ? paidTable : unpaidTable;
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

                // 更新總金額
                updateTotalAmount();
            });

            // 加入游標樣式
            row.style.cursor = 'pointer';
        });
    };

    // 處理兩個表格
    processTableRows(paidTable, true);
    processTableRows(unpaidTable, false);

    updateTotalAmount();

}

function updateOrderInfo(orderId, buyer, isPaid) {
    if (!orderId) return;

    // 確保 info 物件存在
    if (!info.order_infos) {
        info.order_infos = [];
    }

    // 尋找或創建買家的訂單資訊
    let orderInfo = info.order_infos.find(o => o.order_id === orderId);
    if (!orderInfo) {
        orderInfo = {
            order_id: orderId,
            buyers: {}
        };
        info.order_infos.push(orderInfo);
    }

    // 更新買家的付款狀態
    orderInfo.buyers[buyer] = isPaid;

    // 儲存到 localStorage
    localStorage.setItem('DinBenDan-Ext-Info', JSON.stringify(info));
}

// 新增插件啟用狀態的 store 管理
function getExtensionStore() {
    const store = localStorage.getItem('DinBenDan-Ext-Enabled');
    return store ? JSON.parse(store) : { isEnabled: true };
}

function updateExtensionStore(isEnabled) {
    const store = getExtensionStore();
    store.isEnabled = isEnabled;
    localStorage.setItem('DinBenDan-Ext-Enabled', JSON.stringify(store));
}

// 確保 DOM 已經準備好
console.log('[DinBenDon Helper] check DOM ready', document.readyState);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}