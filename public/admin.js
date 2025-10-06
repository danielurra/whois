// Admin Dashboard JavaScript with Authentication

// Authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Dashboard state
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

// Get DOM elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

// Dashboard elements
const searchInput = document.getElementById('search-input');
const sortField = document.getElementById('sort-field');
const sortOrder = document.getElementById('sort-order');
const pageSize = document.getElementById('page-size');
const tableBody = document.getElementById('queries-table-body');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const totalQueriesEl = document.getElementById('total-queries');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');

// Authentication Functions
async function verifyToken() {
  if (!authToken) return false;

  try {
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      return true;
    } else {
      localStorage.removeItem('authToken');
      authToken = null;
      return false;
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    localStorage.removeItem('authToken');
    authToken = null;
    return false;
  }
}

function showError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => {
    errorEl.classList.add('hidden');
  }, 5000);
}

// Login handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      showDashboard();
    } else {
      showError('login-error', data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('login-error', 'Network error. Please try again.');
  }
});

// Register handler
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('register-firstname').value;
  const lastName = document.getElementById('register-lastname').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ firstName, lastName, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      showDashboard();
    } else {
      showError('register-error', data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showError('register-error', 'Network error. Please try again.');
  }
});

// Logout handler
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showAuth();
});

// Toggle between login and register forms
showLoginBtn.addEventListener('click', () => {
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  showLoginBtn.classList.remove('bg-gray-300', 'text-gray-700');
  showLoginBtn.classList.add('bg-blue-600', 'text-white');
  showRegisterBtn.classList.remove('bg-blue-600', 'text-white');
  showRegisterBtn.classList.add('bg-gray-300', 'text-gray-700');
});

showRegisterBtn.addEventListener('click', () => {
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  showRegisterBtn.classList.remove('bg-gray-300', 'text-gray-700');
  showRegisterBtn.classList.add('bg-green-600', 'text-white');
  showLoginBtn.classList.remove('bg-blue-600', 'text-white');
  showLoginBtn.classList.add('bg-gray-300', 'text-gray-700');
});

// UI Functions
function showAuth() {
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
}

function showDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  if (currentUser) {
    userNameSpan.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  }
  fetchQueries();
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fetch and display queries
async function fetchQueries() {
  if (isLoading || !authToken) return;

  isLoading = true;
  tableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: pageSize.value,
      search: searchInput.value.trim(),
      sortBy: sortField.value,
      sortOrder: sortOrder.value
    });

    const response = await fetch(`/api/admin/queries?${params}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        authToken = null;
        showAuth();
        return;
      }
      throw new Error('Failed to fetch queries');
    }

    const data = await response.json();

    // Update pagination info
    totalPages = data.pagination.totalPages;
    currentPageEl.textContent = currentPage;
    totalPagesEl.textContent = totalPages;
    totalQueriesEl.textContent = data.pagination.total.toLocaleString();
    pageInfo.textContent = `${currentPage} of ${totalPages}`;

    // Update pagination buttons
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;

    // Render table
    renderTable(data.data);

  } catch (error) {
    console.error('Error fetching queries:', error);
    tableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-red-600">Error loading data</td></tr>';
  } finally {
    isLoading = false;
  }
}

// Render table rows
function renderTable(queries) {
  if (queries.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">No queries found</td></tr>';
    return;
  }

  tableBody.innerHTML = queries.map(query => {
    const date = new Date(query.created_at);
    const formattedDate = date.toLocaleString();
    const organization = query.organization_name ?
      (query.organization_name.length > 50 ?
        query.organization_name.substring(0, 50) + '...' :
        query.organization_name) :
      '<i class="text-gray-400">N/A</i>';

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm">${query.id}</td>
        <td class="px-4 py-3 text-sm font-mono">${query.searched_ip}</td>
        <td class="px-4 py-3 text-sm">${organization}</td>
        <td class="px-2 py-2 text-sm text-center">
          <img src="/img/us_isp_logos/${query.matched_logo}" alt="Logo" class="max-h-6 w-auto max-w-[40px] object-contain inline-block" title="${query.matched_logo}">
        </td>
        <td class="px-4 py-3 text-sm font-mono">${query.visitor_ip || '<i class="text-gray-400">N/A</i>'}</td>
        <td class="px-4 py-3 text-sm">${query.wan_panel || '<i class="text-gray-400">N/A</i>'}</td>
        <td class="px-4 py-3 text-sm">${formattedDate}</td>
        <td class="px-4 py-3 text-center">
          <button
            class="delete-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
            data-id="${query.id}"
            title="Delete query #${query.id}"
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

// Handle delete query
async function handleDelete(event) {
  const btn = event.target;
  const id = btn.getAttribute('data-id');

  if (!confirm(`Are you sure you want to delete query #${id}?`)) {
    return;
  }

  // Disable button during delete
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  btn.classList.add('opacity-50', 'cursor-not-allowed');

  try {
    const response = await fetch(`/api/admin/queries/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        authToken = null;
        showAuth();
        return;
      }
      throw new Error('Failed to delete query');
    }

    // Refresh the table after successful deletion
    await fetchQueries();
  } catch (error) {
    console.error('Error deleting query:', error);
    alert('Failed to delete query. Please try again.');

    // Re-enable button on error
    btn.disabled = false;
    btn.textContent = 'Delete';
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

// Event listeners for dashboard controls
searchInput.addEventListener('input', debounce(() => {
  currentPage = 1;
  fetchQueries();
}, 500));

sortField.addEventListener('change', () => {
  currentPage = 1;
  fetchQueries();
});

sortOrder.addEventListener('change', () => {
  currentPage = 1;
  fetchQueries();
});

pageSize.addEventListener('change', () => {
  currentPage = 1;
  fetchQueries();
});

prevButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchQueries();
  }
});

nextButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchQueries();
  }
});

// Initial load - check authentication
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await verifyToken();

  if (isAuthenticated) {
    showDashboard();
  } else {
    showAuth();
  }
});
