let allData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let selectedItemId = null;

// Password protection
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
    
    if (sortColumn) {
        applySortToFilteredData();
    }
    
    displayData();
}

// Sort data
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
        l
