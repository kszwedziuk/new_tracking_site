let allData = [];
let filteredData = [];

// Load data from Firebase
async function loadData() {
    try {
        const snapshot = await db.collection('items').orderBy('name').get();
        allData = [];
        snapshot.forEach(doc => {
            allData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        populateFilters();
        filteredData = [...allData];
        displayData();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('results').innerHTML = '<p>Error loading data. Check console.</p>';
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
    
    displayData();
}

// Display data in table
function displayData() {
    const resultsDiv = document.getElementById('results');
    
    if (filteredData.length === 0) {
        resultsDiv.innerHTML = '<p>No items found. Add your first entry above!</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    html += '<th>Category</th>';
    html += '<th>Name</th>';
    html += '<th>Tags</th>';
    html += '<th>Rating</th>';
    html += '<th>Comments</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    filteredData.forEach(item => {
        html += '<tr>';
        html += `<td>${item.category}</td>`;
        html += `<td>${item.name}</td>`;
        html += `<td><div class="tags">`;
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                html += `<span class="tag">${tag}</span>`;
            });
        }
        html += `</div></td>`;
        html += `<td>${item.rating}/10</td>`;
        html += `<td>${item.comments || ''}</td>`;
        html += `<td><button class="delete-btn" onclick="deleteItem('${item.id}')">Delete</button></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
}

// Add new item
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const name = document.getElementById('name').value;
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
    filteredData = [...allData];
    displayData();
}

// Event listeners
document.getElementById('categoryFilter').addEventListener('change', filterData);
document.getElementById('tagFilter').addEventListener('change', filterData);
document.getElementById('ratingFilter').addEventListener('change', filterData);
document.getElementById('resetButton').addEventListener('click', resetFilters);

// Load data when page loads
loadData();
