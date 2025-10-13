// Admin Dashboard JavaScript with Authentication

// Authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Dashboard state
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

// Users state
let usersCurrentPage = 1;
let usersTotalPages = 1;
let isUsersLoading = false;
let currentView = 'queries'; // 'queries' or 'users'

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
const exportCsvBtn = document.getElementById('export-csv-btn');

// Tab elements
const tabQueries = document.getElementById('tab-queries');
const tabUsers = document.getElementById('tab-users');
const tabChangePassword = document.getElementById('tab-change-password');
const queriesSection = document.getElementById('queries-section');
const usersSection = document.getElementById('users-section');
const changePasswordSection = document.getElementById('change-password-section');

// Users section elements
const usersSearchInput = document.getElementById('users-search-input');
const usersSortField = document.getElementById('users-sort-field');
const usersSortOrder = document.getElementById('users-sort-order');
const usersPageSize = document.getElementById('users-page-size');
const usersTableBody = document.getElementById('users-table-body');
const usersPrevButton = document.getElementById('users-prev-page');
const usersNextButton = document.getElementById('users-next-page');
const usersPageInfo = document.getElementById('users-page-info');
const totalUsersEl = document.getElementById('total-users');
const usersCurrentPageEl = document.getElementById('users-current-page');
const usersTotalPagesEl = document.getElementById('users-total-pages');

// Edit user modal elements
const editUserModal = document.getElementById('edit-user-modal');
const editUserForm = document.getElementById('edit-user-form');
const editUserId = document.getElementById('edit-user-id');
const editFirstName = document.getElementById('edit-first-name');
const editLastName = document.getElementById('edit-last-name');
const editEmail = document.getElementById('edit-email');
const editPassword = document.getElementById('edit-password');
const editPasswordConfirm = document.getElementById('edit-password-confirm');
const editUserError = document.getElementById('edit-user-error');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Change password elements
const changePasswordForm = document.getElementById('change-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const passwordStrengthBar = document.getElementById('password-strength-bar');
const passwordStrengthText = document.getElementById('password-strength-text');
const changePasswordError = document.getElementById('change-password-error');
const changePasswordSuccess = document.getElementById('change-password-success');
const cancelPasswordChangeBtn = document.getElementById('cancel-password-change-btn');

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
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  // Validate passwords match
  if (password !== passwordConfirm) {
    showError('register-error', 'Passwords do not match');
    return;
  }

  // Validate password length
  if (password.length < 8) {
    showError('register-error', 'Password must be at least 8 characters long');
    return;
  }

  // Validate password contains letters and numbers
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    showError('register-error', 'Password must contain both letters and numbers');
    return;
  }

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
const authTitle = document.querySelector('#auth-section h1');
const backToLoginDiv = document.getElementById('back-to-login');
const signUpLinkDiv = document.querySelector('#auth-section > div > div:nth-child(4)');

showLoginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  backToLoginDiv.classList.add('hidden');
  signUpLinkDiv.classList.remove('hidden');
  authTitle.textContent = 'Sign in';
});

showRegisterBtn.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  signUpLinkDiv.classList.add('hidden');
  backToLoginDiv.classList.remove('hidden');
  authTitle.textContent = 'Sign up';
});

// UI Functions
function showAuth() {
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  document.body.style.minHeight = '100vh';
  document.body.style.display = 'flex';
  document.body.style.alignItems = 'center';
  document.body.style.justifyContent = 'center';
  document.body.style.padding = '20px';
}

function showDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  document.body.style.background = '#f9fafb';
  document.body.style.minHeight = 'auto';
  document.body.style.display = 'block';
  document.body.style.alignItems = 'initial';
  document.body.style.justifyContent = 'initial';
  document.body.style.padding = '24px';
  if (currentUser) {
    // Display user name with Top Gun badge if applicable
    if (currentUser.role === 'Top Gun') {
      userNameSpan.innerHTML = `${currentUser.firstName} ${currentUser.lastName} <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px; vertical-align: middle;">⭐ TOP GUN</span>`;
    } else {
      userNameSpan.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    }

    // Show/hide Role Management and API Tokens links based on role
    const roleManagementLink = document.querySelector('a[href="/role-management"]');
    const apiTokensLink = document.querySelector('a[href="/api-tokens"]');

    if (roleManagementLink) {
      if (currentUser.role === 'Top Gun') {
        roleManagementLink.style.display = 'inline-block';
      } else {
        roleManagementLink.style.display = 'none';
      }
    }

    if (apiTokensLink) {
      if (currentUser.role === 'Top Gun') {
        apiTokensLink.style.display = 'inline-block';
      } else {
        apiTokensLink.style.display = 'none';
      }
    }

    // Show/hide Users tab based on role
    const usersTabButton = document.getElementById('tab-users');
    if (usersTabButton) {
      if (currentUser.role === 'Read Only Admin') {
        usersTabButton.style.display = 'none';
      } else {
        usersTabButton.style.display = 'inline-block';
      }
    }
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

  // Check if current user has write permissions
  const canWrite = currentUser && currentUser.role !== 'Read Only Admin';

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
        <td class="px-2 py-2 text-sm" style="text-align: center;">${query.id}</td>
        <td class="px-2 py-2 text-xs font-mono">${query.searched_ip}</td>
        <td class="px-2 py-2 text-xs">${organization}</td>
        <td class="px-1 py-2 text-sm text-center">
          <img src="/img/us_isp_logos/${query.matched_logo}" alt="Logo" style="max-height: 32px; max-width: 50px; width: auto; height: auto; object-fit: contain;" class="inline-block" title="${query.matched_logo}">
        </td>
        <td class="px-2 py-2 text-xs font-mono">${query.visitor_ip || '<i class="text-gray-400">N/A</i>'}</td>
        <td class="px-2 py-2 text-xs">${query.wan_panel || '<i class="text-gray-400">N/A</i>'}</td>
        <td class="px-2 py-2 text-xs whitespace-nowrap">${formattedDate}</td>
        <td style="padding: 8px; text-align: center; white-space: nowrap;">
          <button
            class="delete-btn text-white px-3 py-1 text-xs font-semibold border border-white"
            style="background-color: #dc2626; min-width: 60px; border-radius: 6px; ${!canWrite ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
            data-id="${query.id}"
            title="${!canWrite ? 'Read-only access' : 'Delete query #' + query.id}"
            ${!canWrite ? 'disabled' : ''}
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners to delete buttons
  if (canWrite) {
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDelete);
    });
  }
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

// Export to CSV function
async function exportToCSV() {
  const btn = exportCsvBtn;
  const originalText = btn.textContent;

  try {
    // Disable button and show loading state
    btn.disabled = true;
    btn.textContent = 'Exporting...';
    btn.style.opacity = '0.6';

    // Fetch all data (without pagination) with current filters
    const params = new URLSearchParams({
      page: 1,
      limit: 999999, // Get all records
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
        localStorage.removeItem('authToken');
        authToken = null;
        showAuth();
        return;
      }
      throw new Error('Failed to fetch data for export');
    }

    const data = await response.json();

    // Convert to CSV
    const csvContent = convertToCSV(data.data);

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `whois-queries-${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Failed to export CSV. Please try again.');
  } finally {
    // Re-enable button
    btn.disabled = false;
    btn.textContent = originalText;
    btn.style.opacity = '1';
  }
}

// Convert data to CSV format
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return 'No data to export';
  }

  // CSV headers
  const headers = ['ID', 'Searched IP', 'Organization Name', 'Matched Logo', 'Visitor IP', 'WAN Panel', 'Date'];

  // Create CSV rows
  const rows = data.map(query => {
    const date = new Date(query.created_at).toLocaleString();
    return [
      query.id,
      query.searched_ip,
      escapeCSVField(query.organization_name || ''),
      query.matched_logo,
      query.visitor_ip || '',
      query.wan_panel || '',
      date
    ];
  });

  // Combine headers and rows
  const csvArray = [headers, ...rows];

  // Convert to CSV string
  return csvArray.map(row =>
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
}

// Escape CSV fields that contain special characters
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }
  // Convert to string and escape double quotes
  return String(field).replace(/"/g, '""');
}

// Tab switching
function switchTab(view) {
  currentView = view;

  // Hide all sections
  queriesSection.classList.add('hidden');
  usersSection.classList.add('hidden');
  changePasswordSection.classList.add('hidden');

  // Reset all tab styles
  tabQueries.style.background = 'transparent';
  tabQueries.style.color = '#4b5563';
  tabUsers.style.background = 'transparent';
  tabUsers.style.color = '#4b5563';
  tabChangePassword.style.background = 'transparent';
  tabChangePassword.style.color = '#4b5563';

  if (view === 'queries') {
    queriesSection.classList.remove('hidden');
    tabQueries.style.background = '#2563eb';
    tabQueries.style.color = 'white';
  } else if (view === 'users') {
    usersSection.classList.remove('hidden');
    tabUsers.style.background = '#2563eb';
    tabUsers.style.color = 'white';
    fetchUsers();
  } else if (view === 'change-password') {
    changePasswordSection.classList.remove('hidden');
    tabChangePassword.style.background = '#2563eb';
    tabChangePassword.style.color = 'white';
    // Clear form when opening
    changePasswordForm.reset();
    passwordStrengthBar.style.width = '0%';
    passwordStrengthText.textContent = '-';
    changePasswordError.style.display = 'none';
    changePasswordSuccess.style.display = 'none';
  }
}

// Calculate password strength
function calculatePasswordStrength(password) {
  if (!password) {
    return { score: 0, width: 0, color: '#d1d5db', text: '-' };
  }

  let score = 0;
  const checks = {
    length: false,
    lowercase: false,
    uppercase: false,
    numbers: false,
    special: false,
    longLength: false
  };

  // Length checks
  if (password.length >= 8) {
    score += 20;
    checks.length = true;
  }
  if (password.length >= 12) {
    score += 10;
    checks.longLength = true;
  }
  if (password.length >= 16) {
    score += 10;
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 15;
    checks.lowercase = true;
  }
  if (/[A-Z]/.test(password)) {
    score += 15;
    checks.uppercase = true;
  }
  if (/[0-9]/.test(password)) {
    score += 15;
    checks.numbers = true;
  }
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 15;
    checks.special = true;
  }

  // Bonus points for having all character types
  const varietyCount = [checks.lowercase, checks.uppercase, checks.numbers, checks.special].filter(Boolean).length;
  if (varietyCount >= 3) {
    score += 10;
  }
  if (varietyCount === 4) {
    score += 10;
  }

  // Penalties for common patterns
  if (/^[0-9]+$/.test(password)) {
    score -= 20; // Only numbers
  }
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10; // Only letters
  }
  if (/(.)\1{2,}/.test(password)) {
    score -= 10; // Repeated characters
  }
  if (/^(12345|password|qwerty|abc123)/i.test(password)) {
    score -= 30; // Common patterns
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine color and text based on score
  let color, text, width;

  if (score < 30) {
    color = '#ef4444'; // Red
    text = 'Weak';
    width = score;
  } else if (score < 50) {
    color = '#f97316'; // Orange
    text = 'Fair';
    width = score;
  } else if (score < 70) {
    color = '#eab308'; // Yellow
    text = 'Good';
    width = score;
  } else if (score < 85) {
    color = '#84cc16'; // Light green
    text = 'Strong';
    width = score;
  } else {
    color = '#22c55e'; // Green
    text = 'Excellent';
    width = score;
  }

  return { score, width, color, text };
}

// Update password strength indicator
function updatePasswordStrength() {
  const password = newPasswordInput.value;
  const strength = calculatePasswordStrength(password);

  passwordStrengthBar.style.width = strength.width + '%';
  passwordStrengthBar.style.background = strength.color;
  passwordStrengthText.textContent = strength.text;
  passwordStrengthText.style.color = strength.color;
}

// Fetch and display users
async function fetchUsers() {
  if (isUsersLoading || !authToken) return;

  isUsersLoading = true;
  usersTableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: usersCurrentPage,
      limit: usersPageSize.value,
      search: usersSearchInput.value.trim(),
      sortBy: usersSortField.value,
      sortOrder: usersSortOrder.value
    });

    const response = await fetch(`/api/admin/users?${params}`, {
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
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();

    // Update pagination info
    usersTotalPages = data.pagination.totalPages;
    usersCurrentPageEl.textContent = usersCurrentPage;
    usersTotalPagesEl.textContent = usersTotalPages;
    totalUsersEl.textContent = data.pagination.total.toLocaleString();
    usersPageInfo.textContent = `${usersCurrentPage} of ${usersTotalPages}`;

    // Update pagination buttons
    usersPrevButton.disabled = usersCurrentPage <= 1;
    usersNextButton.disabled = usersCurrentPage >= usersTotalPages;

    // Render table
    renderUsersTable(data.data);

  } catch (error) {
    console.error('Error fetching users:', error);
    usersTableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-red-600">Error loading data</td></tr>';
  } finally {
    isUsersLoading = false;
  }
}

// Render users table
function renderUsersTable(users) {
  if (users.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">No users found</td></tr>';
    return;
  }

  // Check if current user has write permissions
  const canWrite = currentUser && currentUser.role !== 'Read Only Admin';

  usersTableBody.innerHTML = users.map(user => {
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A';
    const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
    const role = user.role || 'Webapp Admin';

    // Role badge styling
    let roleBadgeStyle = '';
    if (role === 'Top Gun') {
      roleBadgeStyle = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;';
    } else if (role === 'Read Only Admin') {
      roleBadgeStyle = 'background: #fef3c7; color: #92400e;';
    } else {
      roleBadgeStyle = 'background: #dbeafe; color: #1e40af;';
    }

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-2 py-2 text-sm" style="text-align: center;">${user.id}</td>
        <td class="px-2 py-2 text-sm">${user.first_name}</td>
        <td class="px-2 py-2 text-sm">${user.last_name}</td>
        <td class="px-2 py-2 text-sm">${user.email}</td>
        <td class="px-2 py-2 text-xs" style="text-align: center;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; ${roleBadgeStyle}">
            ${role}
          </span>
        </td>
        <td class="px-2 py-2 text-xs whitespace-nowrap">${createdAt}</td>
        <td class="px-2 py-2 text-xs whitespace-nowrap">${lastLogin}</td>
        <td style="padding: 8px; text-align: center; white-space: nowrap;">
          <button
            class="edit-user-btn text-white px-3 py-1 text-xs font-semibold"
            style="background-color: #2563eb; margin-right: 4px; border-radius: 6px; ${!canWrite ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
            data-id="${user.id}"
            data-firstname="${user.first_name}"
            data-lastname="${user.last_name}"
            data-email="${user.email}"
            title="${!canWrite ? 'Read-only access' : 'Edit user #' + user.id}"
            ${!canWrite ? 'disabled' : ''}
          >
            Edit
          </button>
          <button
            class="delete-user-btn text-white px-3 py-1 text-xs font-semibold"
            style="background-color: #dc2626; border-radius: 6px; ${!canWrite ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
            data-id="${user.id}"
            title="${!canWrite ? 'Read-only access' : 'Delete user #' + user.id}"
            ${!canWrite ? 'disabled' : ''}
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners to edit and delete buttons
  if (canWrite) {
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', handleEditUser);
    });

    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteUser);
    });
  }
}

// Handle edit user
function handleEditUser(event) {
  const btn = event.target;
  const id = btn.getAttribute('data-id');
  const firstName = btn.getAttribute('data-firstname');
  const lastName = btn.getAttribute('data-lastname');
  const email = btn.getAttribute('data-email');

  // Populate form
  editUserId.value = id;
  editFirstName.value = firstName;
  editLastName.value = lastName;
  editEmail.value = email;

  // Clear password fields
  editPassword.value = '';
  editPasswordConfirm.value = '';

  // Show modal
  editUserModal.classList.remove('hidden');
  editUserModal.style.display = 'flex';
  editUserError.style.display = 'none';
}

// Handle edit form submission
editUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editUserId.value;
  const firstName = editFirstName.value;
  const lastName = editLastName.value;
  const email = editEmail.value;
  const password = editPassword.value;
  const passwordConfirm = editPasswordConfirm.value;

  // Validate password fields if password is provided
  if (password || passwordConfirm) {
    if (password !== passwordConfirm) {
      editUserError.textContent = 'Passwords do not match';
      editUserError.style.display = 'block';
      return;
    }
    if (password.length < 8) {
      editUserError.textContent = 'Password must be at least 8 characters long';
      editUserError.style.display = 'block';
      return;
    }

    // Validate password contains letters and numbers
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      editUserError.textContent = 'Password must contain both letters and numbers';
      editUserError.style.display = 'block';
      return;
    }
  }

  // Hide error before submission
  editUserError.style.display = 'none';

  try {
    const updateData = { firstName, lastName, email };
    // Only include password if it was provided
    if (password) {
      updateData.password = password;
    }

    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (response.ok) {
      // Close modal and refresh users
      editUserModal.classList.add('hidden');
      editUserModal.style.display = 'none';
      await fetchUsers();
    } else {
      editUserError.textContent = data.error || 'Failed to update user';
      editUserError.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating user:', error);
    editUserError.textContent = 'Network error. Please try again.';
    editUserError.style.display = 'block';
  }
});

// Cancel edit
cancelEditBtn.addEventListener('click', () => {
  editUserModal.classList.add('hidden');
  editUserModal.style.display = 'none';
});

// Close modal when clicking outside
editUserModal.addEventListener('click', (e) => {
  if (e.target === editUserModal) {
    editUserModal.classList.add('hidden');
    editUserModal.style.display = 'none';
  }
});

// Handle delete user
async function handleDeleteUser(event) {
  const btn = event.target;
  const id = btn.getAttribute('data-id');

  if (!confirm(`Are you sure you want to delete user #${id}?`)) {
    return;
  }

  // Disable button during delete
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  btn.classList.add('opacity-50', 'cursor-not-allowed');

  try {
    const response = await fetch(`/api/admin/users/${id}`, {
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

      const data = await response.json();
      throw new Error(data.error || 'Failed to delete user');
    }

    // Refresh the table after successful deletion
    await fetchUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
    alert(error.message || 'Failed to delete user. Please try again.');

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

exportCsvBtn.addEventListener('click', exportToCSV);

// Tab switching event listeners
tabQueries.addEventListener('click', () => switchTab('queries'));
tabUsers.addEventListener('click', () => switchTab('users'));
tabChangePassword.addEventListener('click', () => switchTab('change-password'));

// Change password event listeners
newPasswordInput.addEventListener('input', updatePasswordStrength);

cancelPasswordChangeBtn.addEventListener('click', () => {
  switchTab('queries');
});

changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  // Hide previous messages
  changePasswordError.style.display = 'none';
  changePasswordSuccess.style.display = 'none';

  // Validate passwords match
  if (newPassword !== confirmNewPassword) {
    changePasswordError.textContent = 'New passwords do not match';
    changePasswordError.style.display = 'block';
    return;
  }

  // Validate minimum length
  if (newPassword.length < 8) {
    changePasswordError.textContent = 'Password must be at least 8 characters long';
    changePasswordError.style.display = 'block';
    return;
  }

  // Validate password contains letters and numbers
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  if (!hasLetter || !hasNumber) {
    changePasswordError.textContent = 'Password must contain both letters and numbers';
    changePasswordError.style.display = 'block';
    return;
  }

  // Validate new password is different from current
  if (newPassword === currentPassword) {
    changePasswordError.textContent = 'New password must be different from current password';
    changePasswordError.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      changePasswordSuccess.textContent = 'Password changed successfully!';
      changePasswordSuccess.style.display = 'block';
      changePasswordForm.reset();
      passwordStrengthBar.style.width = '0%';
      passwordStrengthText.textContent = '-';
      passwordStrengthText.style.color = '#6b7280';
    } else {
      changePasswordError.textContent = data.error || 'Failed to change password';
      changePasswordError.style.display = 'block';
    }
  } catch (error) {
    console.error('Error changing password:', error);
    changePasswordError.textContent = 'Network error. Please try again.';
    changePasswordError.style.display = 'block';
  }
});

// Users section event listeners
usersSearchInput.addEventListener('input', debounce(() => {
  usersCurrentPage = 1;
  fetchUsers();
}, 500));

usersSortField.addEventListener('change', () => {
  usersCurrentPage = 1;
  fetchUsers();
});

usersSortOrder.addEventListener('change', () => {
  usersCurrentPage = 1;
  fetchUsers();
});

usersPageSize.addEventListener('change', () => {
  usersCurrentPage = 1;
  fetchUsers();
});

usersPrevButton.addEventListener('click', () => {
  if (usersCurrentPage > 1) {
    usersCurrentPage--;
    fetchUsers();
  }
});

usersNextButton.addEventListener('click', () => {
  if (usersCurrentPage < usersTotalPages) {
    usersCurrentPage++;
    fetchUsers();
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
