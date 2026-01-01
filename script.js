let allData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';

// Password protection
const CORRECT_PASSWORD = 'themagicword'; // CHANGE THIS TO YOUR PASSWORD

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

// Load data from Firebase
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

// Load custom categories from Firebase
async function loadCustomCategories() {
    try {
        const doc = await db.collection('settings').doc('customCategories').get();
        if (doc.exists) {
            const customCats = doc.data().categories || [];
            const categorySelect = document.getElementById('category');
            
            // Remove old custom categories (anything after "Other")
            const options = Array.from(categorySelect.options);
            const otherIndex = options.findIndex(opt => opt.value === 'Other');
            while (categorySelect.options.length > otherIndex + 1) {
                categorySelect.remove(otherIndex + 1);
            }
            
            // Add custom categories before "Other"
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

// Save custom category to Firebase
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

// Populate filter dropdowns
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

// Filter data based on selected filters
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
    
    // Re-apply current sort if exists
    if (sortColumn) {
        applySortToFilteredData();
    }
    
    displayData();
}

// Sort data
function sortData(column) {
    if (sortColumn === column) {
        // Toggle direction if clicking same column
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
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
        
        // Handle special cases
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
            // String comparison
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

// Display data in table
function displayData() {
    const resultsDiv = document.getElementById('results');
    
    if (filteredData.length === 0) {
        resultsDiv.innerHTML = '<p>No items found. Add your first entry above!</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    html += '<th class="sortable" data-column="category">Category</th>';
    html += '<th class="sortable" data-column="name">Name</th>';
    html += '<th class="sortable" data-column="creator">Creator</th>';
    html += '<th class="sortable" data-column="dateExperienced">Date Experienced</th>';
    html += '<th>Tags</th>';
    html += '<th class="sortable" data-column="rating">Rating</th>';
    html += '<th>Comments</th>';
    html += '<th class="sortable" data-column="createdAt">Date Added</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    filteredData.forEach(item => {
        html += '<tr>';
        html += `<td>${item.category}</td>`;
        html += `<td>${item.name}</td>`;
        html += `<td>${item.creator || ''}</td>`;
        
        // Format date experienced
        let dateExpStr = '';
        if (item.dateExperienced) {
            dateExpStr = new Date(item.dateExperienced).toLocaleDateString();
        }
        html += `<td>${dateExpStr}</td>`;
        
        html += `<td><div class="tags">`;
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                html += `<span class="tag">${tag}</span>`;
            });
        }
        html += `</div></td>`;
        html += `<td>${item.rating}/10</td>`;
        html += `<td>${item.comments || ''}</td>`;
        
        // Format date added
        let dateStr = '';
        if (item.createdAt) {
            const date = item.createdAt.toDate();
            dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        html += `<td>${dateStr}</td>`;
        
        html += `<td><button class="delete-btn" onclick="deleteItem('${item.id}')">Delete</button></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
    
    // Add click handlers for sorting
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            sortData(column);
        });
        
        // Update sort indicators
        if (th.dataset.column === sortColumn) {
            th.classList.remove('sorted-asc', 'sorted-desc');
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        } else {
            th.classList.remove('sorted-asc', 'sorted-desc');
        }
    });
}
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
}

// Add new item
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let category = document.getElementById('category').value;
    const customCategory = document.getElementById('customCategory').value.trim();
    
    // If "Other" is selected and custom category provided, use custom category
    if (category === 'Other' && customCategory) {
        category = customCategory;
        await saveCustomCategory(category);
    } else if (category === 'Other' && !customCategory) {
        alert('Please enter a custom category');
        return;
    }
    
    const name = document.getElementById('name').value;
    const creator = document.getElementById('creator').value;
    const dateExperienced = document.getElementById('dateExperienced').value;
    const rating = parseInt(document.getElementById('rating').value);
    const tagsInput = document.getElementById('tags').value;
    const comments = document.getElementById('comments').value;
    
    // Parse tags
    const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    
    try {
        await db.collection('items').add({
            category: category,
            name: name,
            creator: creator,
            dateExperienced: dateExperienced,
            tags: tags,
            rating: rating,
            comments: comments,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success message
        const formSection = document.querySelector('.form-section');
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.textContent = 'Entry added successfully!';
        formSection.insertBefore(successMsg, formSection.firstChild);
        setTimeout(() => successMsg.remove(), 3000);
        
        // Reset form
        document.getElementById('addForm').reset();
        document.getElementById('customCategoryGroup').style.display = 'none';
        
        // Reload data
        await loadData();
    } catch (error) {
        console.error('Error adding item:', error);
        alert('Error adding item. Check console.');
    }
});

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        await db.collection('items').doc(id).delete();
        await loadData();
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Check console.');
    }
}

// Reset filters
function resetFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('tagFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    sortColumn = null;
    sortDirection = 'asc';
    filteredData = [...allData];
    displayData();
}

// Event listeners
document.getElementById('categoryFilter').addEventListener('change', filterData);
document.getElementById('tagFilter').addEventListener('change', filterData);
document.getElementById('ratingFilter').addEventListener('change', filterData);
document.getElementById('resetButton').addEventListener('click', resetFilters);

// Show/hide custom category input when "Other" is selected
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

// Load data when page loads
checkPassword();
