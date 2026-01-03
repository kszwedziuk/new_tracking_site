let allData = [];
let inProgressData = [];
let completedData = [];
let selectedItemId = null;

const CORRECT_PASSWORD = 'password1';

function checkPassword() {
    const savedPassword = sessionStorage.getItem('trackerAuth');
    if (savedPassword === CORRECT_PASSWORD) {
        showMainContent();
        loadData();
    }
}

function showMainContent() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

function hideMainContent() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('passwordInput').value;
    
    if (password === CORRECT_PASSWORD) {
        sessionStorage.setItem('trackerAuth', password);
        showMainContent();
        loadData();
    } else {
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('passwordInput').value = '';
    }
});

document.getElementById('logoutButton').addEventListener('click', () => {
    sessionStorage.removeItem('trackerAuth');
    hideMainContent();
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').style.display = 'none';
});

async function loadData() {
    try {
        const snapshot = await db.collection('items').orderBy('createdAt', 'desc').get();
        allData = [];
        snapshot.forEach(doc => {
            allData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        await loadCustomCategories();
        populateFilters();
        separateData();
        displayBothTables();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('completedResults').innerHTML = '<p>Error loading data. Check console.</p>';
    }
}

function separateData() {
    inProgressData = allData.filter(item => item.status === 'in_progress');
    completedData = allData.filter(item => item.status === 'completed');
}

async function loadCustomCategories() {
    try {
        const doc = await db.collection('settings').doc('customCategories').get();
        if (doc.exists) {
            const customCats = doc.data().categories || [];
            const categorySelect = document.getElementById('category');
            const options = Array.from(categorySelect.options);
            const otherIndex = options.findIndex(opt => opt.value === 'Other');
            while (categorySelect.options.length > otherIndex + 1) {
                categorySelect.remove(otherIndex + 1);
            }
            customCats.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categorySelect.insertBefore(option, categorySelect.options[otherIndex]);
            });
        }
    } catch (error) {
        console.error('Error loading custom categories:', error);
    }
}

async function saveCustomCategory(category) {
    try {
        const doc = await db.collection('settings').doc('customCategories').get();
        let categories = [];
        if (doc.exists) {
            categories = doc.data().categories || [];
        }
        if (!categories.includes(category)) {
            categories.push(category);
            categories.sort();
            await db.collection('settings').doc('customCategories').set({
                categories: categories
            });
        }
    } catch (error) {
        console.error('Error saving custom category:', error);
    }
}

function populateFilters() {
    const categories = [...new Set(allData.map(item => item.category))].sort();
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });
    const allTags = new Set();
    allData.forEach(item => {
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => allTags.add(tag));
        }
    });
    const tags = [...allTags].sort();
    const tagFilter = document.getElementById('tagFilter');
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
}

function filterData() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const tagFilter = document.getElementById('tagFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    
    inProgressData = allData.filter(item => {
        if (item.status !== 'in_progress') return false;
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (tagFilter && (!item.tags || !item.tags.includes(tagFilter))) return false;
        return true;
    });

    completedData = allData.filter(item => {
        if (item.status !== 'completed') return false;
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (tagFilter && (!item.tags || !item.tags.includes(tagFilter))) return false;
        if (ratingFilter && item.rating < parseInt(ratingFilter)) return false;
        return true;
    });
    
    displayBothTables();
}

function displayBothTables() {
    displayInProgressTable();
    displayCompletedTable();
}

function displayInProgressTable() {
    const resultsDiv = document.getElementById('inProgressResults');
    
    if (inProgressData.length === 0) {
        resultsDiv.innerHTML = '<p>No items in progress.</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    html += '<th>Name</th>';
    html += '<th>Creator</th>';
    html += '<th>Category</th>';
    html += '<th>Progress</th>';
    html += '<th>Tags</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    inProgressData.forEach(item => {
        const isSelected = item.id === selectedItemId;
        html += `<tr class="${isSelected ? 'selected' : ''}" data-id="${item.id}">`;
        html += `<td>${item.name}</td>`;
        html += `<td>${item.creator || ''}</td>`;
        html += `<td>${item.category}</td>`;
        
        // Progress bar
        const current = item.currentUnits || 0;
        const total = item.totalUnits || 1;
        const percentage = Math.round((current / total) * 100);
        html += `<td>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
                <div class="progress-text">${current}/${total} (${percentage}%)</div>
            </div>
        </td>`;
        
        html += `<td><div class="tags">`;
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                html += `<span class="tag">${tag}</span>`;
            });
        }
        html += `</div></td>`;
        html += `<td><button class="complete-btn" onclick="markAsCompleted('${item.id}')">Mark Complete</button></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
    
    document.querySelectorAll('#inProgressResults tbody tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.classList.contains('complete-btn')) {
                selectItem(row.dataset.id);
            }
        });
    });
}

function displayCompletedTable() {
    const resultsDiv = document.getElementById('completedResults');
    
    if (completedData.length === 0) {
        resultsDiv.innerHTML = '<p>No completed items yet!</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    html += '<th>Name</th>';
    html += '<th>Creator</th>';
    html += '<th>Tags</th>';
    html += '<th>Rating</th>';
    html += '<th>Comments</th>';
    html += '<th>Date Added</th>';
    html += '</tr></thead><tbody>';
    
    completedData.forEach(item => {
        const isSelected = item.id === selectedItemId;
        html += `<tr class="${isSelected ? 'selected' : ''}" data-id="${item.id}">`;
        html += `<td>${item.name}</td>`;
        html += `<td>${item.creator || ''}</td>`;
        html += `<td><div class="tags">`;
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                html += `<span class="tag">${tag}</span>`;
            });
        }
        html += `</div></td>`;
        const rating = Number(item.rating);
        const ratingDisplay = Number.isInteger(rating) ? rating : rating.toFixed(1);
        html += `<td>${ratingDisplay}/10</td>`;
        html += `<td>${item.comments || ''}</td>`;
        let dateStr = '';
        if (item.createdAt) {
            const date = item.createdAt.toDate();
            dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        html += `<td>${dateStr}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
    
    document.querySelectorAll('#completedResults tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            selectItem(row.dataset.id);
        });
    });
}

function selectItem(itemId) {
    if (selectedItemId === itemId) {
        selectedItemId = null;
        
        const isEditing = document.getElementById('addForm').dataset.editingId;
        
        if (isEditing) {
            document.getElementById('status').value = 'in_progress';
            document.getElementById('category').value = '';
            document.getElementById('name').value = '';
            document.getElementById('creator').value = '';
            document.getElementById('totalUnits').value = '';
            document.getElementById('currentUnits').value = '';
            document.getElementById('rating').value = 5;
            document.getElementById('ratingValue').textContent = '5';
            document.getElementById('tags').value = '';
            document.getElementById('comments').value = '';
            
            document.querySelector('.form-section h2').textContent = 'Add New Entry';
            document.querySelector('#addForm button[type="submit"]').textContent = 'Add Entry';
            delete document.getElementById('addForm').dataset.editingId;
            document.getElementById('customCategoryGroup').style.display = 'none';
            toggleStatusFields();
        }
    } else {
        selectedItemId = itemId;
    }
    updateSelectionUI();
    displayBothTables();
}

function updateSelectionUI() {
    const editButton = document.getElementById('editButton');
    const deleteButton = document.getElementById('deleteButton');
    if (selectedItemId) {
        const selectedItem = allData.find(item => item.id === selectedItemId);
        if (selectedItem) {
            editButton.disabled = false;
            deleteButton.disabled = false;
        }
    } else {
        editButton.disabled = true;
        deleteButton.disabled = true;
    }
}

async function markAsCompleted(itemId) {
    const item = allData.find(i => i.id === itemId);
    if (!item) return;
    
    // Prompt for rating
    const ratingInput = prompt(`Rate "${item.name}" (0-10):`);
    if (ratingInput === null) return; // Cancelled
    
    const rating = parseFloat(ratingInput);
    if (isNaN(rating) || rating < 0 || rating > 10) {
        alert('Please enter a valid rating between 0 and 10');
        return;
    }
    
    const comments = prompt('Add comments (optional):') || '';
    
    try {
        await db.collection('items').doc(itemId).update({
            status: 'completed',
            rating: rating,
            comments: comments,
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await loadData();
    } catch (error) {
        console.error('Error marking as completed:', error);
        alert('Error updating item. Check console.');
    }
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const status = document.getElementById('status').value;
    let category = document.getElementById('category').value;
    const customCategory = document.getElementById('customCategory').value.trim();
    
    if (category === 'Other' && customCategory) {
        category = customCategory;
        await saveCustomCategory(category);
    } else if (category === 'Other' && !customCategory) {
        alert('Please enter a custom category');
        return;
    }
    
    const name = document.getElementById('name').value;
    const creator = document.getElementById('creator').value;
    const tagsInput = document.getElementById('tags').value;
    const today = new Date().toISOString().split('T')[0];
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    const editingId = document.getElementById('addForm').dataset.editingId;
    
    const itemData = {
        status: status,
        category: category,
        name: name,
        creator: creator,
        dateExperienced: today,
        tags: tags
    };
    
    if (status === 'in_progress') {
        const totalUnits = parseInt(document.getElementById('totalUnits').value) || 0;
        const currentUnits = parseInt(document.getElementById('currentUnits').value) || 0;
        itemData.totalUnits = totalUnits;
        itemData.currentUnits = currentUnits;
        
        // Auto-complete if 100%
        if (totalUnits > 0 && currentUnits >= totalUnits) {
            const autoComplete = confirm('Progress is 100%. Mark as completed?');
            if (autoComplete) {
                const rating = parseFloat(document.getElementById('rating').value);
                const comments = document.getElementById('comments').value;
                itemData.status = 'completed';
