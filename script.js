let allData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
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
        filteredData = [...allData];
        displayData();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('results').innerHTML = '<p>Error loading data. Check console.</p>';
    }
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
    filteredData = allData.filter(item => {
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (tagFilter && (!item.tags || !item.tags.includes(tagFilter))) return false;
        if (ratingFilter && item.rating < parseInt(ratingFilter)) return false;
        return true;
    });
    if (sortColumn) {
        applySortToFilteredData();
    }
    displayData();
}

function sortData(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    applySortToFilteredData();
    displayData();
}

function applySortToFilteredData() {
    filteredData.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (sortColumn === 'createdAt') {
            aVal = a.createdAt ? a.createdAt.toDate().getTime() : 0;
            bVal = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        } else if (sortColumn === 'dateExperienced') {
            aVal = a.dateExperienced ? new Date(a.dateExperienced).getTime() : 0;
            bVal = b.dateExperienced ? new Date(b.dateExperienced).getTime() : 0;
        } else if (sortColumn === 'rating') {
            aVal = a.rating || 0;
            bVal = b.rating || 0;
        } else {
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function displayData() {
    const resultsDiv = document.getElementById('results');
    if (filteredData.length === 0) {
        resultsDiv.innerHTML = '<p>No items found. Add your first entry above!</p>';
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
    filteredData.forEach(item => {
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
    document.querySelectorAll('tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            selectItem(row.dataset.id);
        });
    });
}

function selectItem(itemId) {
    if (selectedItemId === itemId) {
        // Deselecting - always clear the form
        selectedItemId = null;
        
        // Clear and reset the form
        document.getElementById('addForm').reset();
        document.getElementById('ratingValue').textContent = '5';
        document.querySelector('.form-section h2').textContent = 'Add New Entry';
        document.querySelector('#addForm button[type="submit"]').textContent = 'Add Entry';
        delete document.getElementById('addForm').dataset.editingId;
        document.getElementById('customCategoryGroup').style.display = 'none';
    } else {
        selectedItemId = itemId;
    }
    updateSelectionUI();
    displayData();
}

function updateSelectionUI() {
    const editButton = document.getElementById('editButton');
    const deleteButton = document.getElementById('deleteButton');
    if (selectedItemId) {
        const selectedItem = filteredData.find(item => item.id === selectedItemId);
        if (selectedItem) {
            editButton.disabled = false;
            deleteButton.disabled = false;
        }
    } else {
        editButton.disabled = true;
        deleteButton.disabled = true;
    }
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
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
    const rating = parseFloat(document.getElementById('rating').value);
    const tagsInput = document.getElementById('tags').value;
    const comments = document.getElementById('comments').value;
    const today = new Date().toISOString().split('T')[0];
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const editingId = document.getElementById('addForm').dataset.editingId;
    try {
        if (editingId) {
            await db.collection('items').doc(editingId).update({
                category: category,
                name: name,
                creator: creator,
                dateExperienced: today,
                tags: tags,
                rating: rating,
                comments: comments
            });
            document.querySelector('.form-section h2').textContent = 'Add New Entry';
            document.querySelector('#addForm button[type="submit"]').textContent = 'Add Entry';
            delete document.getElementById('addForm').dataset.editingId;
            selectedItemId = null;
            updateSelectionUI();
        } else {
            await db.collection('items').add({
                category: category,
                name: name,
                creator: creator,
                dateExperienced: today,
                tags: tags,
                rating: rating,
                comments: comments,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        const formSection = document.querySelector('.form-section');
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = editingId ? 'Entry updated successfully!' : 'Entry added successfully!';
        formSection.insertBefore(successMsg, formSection.firstChild);
        setTimeout(() => successMsg.remove(), 3000);
        document.getElementById('addForm').reset();
        document.getElementById('ratingValue').textContent = '5';
        document.getElementById('customCategoryGroup').style.display = 'none';
        await loadData();
    } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item. Check console.');
    }
});

async function deleteSelectedItem() {
    if (!selectedItemId) return;
    const selectedItem = filteredData.find(item => item.id === selectedItemId);
    if (!selectedItem) return;
    if (!confirm(`Are you sure you want to delete "${selectedItem.name}"?`)) {
        return;
    }
    try {
        await db.collection('items').doc(selectedItemId).delete();
        selectedItemId = null;
        updateSelectionUI();
        await loadData();
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Check console.');
    }
}

function editSelectedItem() {
    if (!selectedItemId) return;
    const selectedItem = allData.find(item => item.id === selectedItemId);
    if (!selectedItem) return;
    document.getElementById('category').value = selectedItem.category;
    document.getElementById('name').value = selectedItem.name;
    document.getElementById('creator').value = selectedItem.creator || '';
    document.getElementById('rating').value = selectedItem.rating;
    const ratingValue = Number(selectedItem.rating);
    const ratingDisplay = Number.isInteger(ratingValue) ? ratingValue : ratingValue.toFixed(1);
    document.getElementById('ratingValue').textContent = ratingDisplay;
    document.getElementById('tags').value = selectedItem.tags ? selectedItem.tags.join(', ') : '';
    document.getElementById('comments').value = selectedItem.comments || '';
    const formSection = document.querySelector('.form-section');
    formSection.querySelector('h2').textContent = 'Edit Entry';
    document.querySelector('#addForm button[type="submit"]').textContent = 'Update Entry';
    document.getElementById('addForm').dataset.editingId = selectedItemId;
    formSection.scrollIntoView({ behavior: 'smooth' });
}

function resetFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('tagFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    sortColumn = null;
    sortDirection = 'asc';
    filteredData = [...allData];
    displayData();
}

document.getElementById('categoryFilter').addEventListener('change', filterData);
document.getElementById('tagFilter').addEventListener('change', filterData);
document.getElementById('ratingFilter').addEventListener('change', filterData);
document.getElementById('resetButton').addEventListener('click', resetFilters);
document.getElementById('editButton').addEventListener('click', editSelectedItem);
document.getElementById('deleteButton').addEventListener('click', deleteSelectedItem);
document.getElementById('category').addEventListener('change', function() {
    const customCategoryGroup = document.getElementById('customCategoryGroup');
    if (this.value === 'Other') {
        customCategoryGroup.style.display = 'flex';
        document.getElementById('customCategory').required = true;
    } else {
        customCategoryGroup.style.display = 'none';
        document.getElementById('customCategory').required = false;
    }
});

document.getElementById('rating').addEventListener('input', function() {
    const value = Number(this.value);
    const display = Number.isInteger(value) ? value : value.toFixed(1);
    document.getElementById('ratingValue').textContent = display;
});

checkPassword();
