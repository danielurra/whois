// API Token Management Dashboard JavaScript

// State management
let currentTab = 'users';
let usersPage = 1;
let tokensPage = 1;
let usersData = { data: [], pagination: {} };
let tokensData = { data: [], pagination: {} };
let allUsers = [];

// Get auth token
const getAuthToken = () => localStorage.getItem('authToken');

// Check authentication
const checkAuth = async () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/reguser';
    return false;
  }

  try {
    const response = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      localStorage.removeItem('authToken');
      window.location.href = '/reguser';
      return false;
    }

    const data = await response.json();
    document.getElementById('user-name').textContent = `${data.user.firstName} ${data.user.lastName}`;
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/reguser';
    return false;
  }
};

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = '/reguser';
});

// Tab switching
document.getElementById('tab-users').addEventListener('click', () => {
  currentTab = 'users';
  document.getElementById('tab-users').classList.add('active');
  document.getElementById('tab-tokens').classList.remove('active');
  document.getElementById('users-section').classList.remove('hidden');
  document.getElementById('tokens-section').classList.add('hidden');
  loadUsers();
});

document.getElementById('tab-tokens').addEventListener('click', () => {
  currentTab = 'tokens';
  document.getElementById('tab-tokens').classList.add('active');
  document.getElementById('tab-users').classList.remove('active');
  document.getElementById('tokens-section').classList.remove('hidden');
  document.getElementById('users-section').classList.add('hidden');
  loadTokens();
});

// ========== API USERS MANAGEMENT ==========

// Load users
const loadUsers = async () => {
  const token = getAuthToken();
  const search = document.getElementById('users-search').value;
  const sortBy = document.getElementById('users-sort').value;
  const sortOrder = document.getElementById('users-order').value;

  try {
    const response = await fetch(
      `/api/admin/api-users?page=${usersPage}&limit=50&search=${encodeURIComponent(search)}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error('Failed to load users');

    usersData = await response.json();
    renderUsers();
    updateUserStats();
  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('users-table-body').innerHTML = `
      <tr><td colspan="8" style="text-align: center; color: #dc2626;">Error loading users</td></tr>
    `;
  }
};

// Render users table
const renderUsers = () => {
  const tbody = document.getElementById('users-table-body');

  if (usersData.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #6b7280;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = usersData.data.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.first_name} ${user.last_name}</td>
      <td>${user.email}</td>
      <td>${user.phone || '-'}</td>
      <td>${user.website ? `<a href="${user.website}" target="_blank" style="color: #2563eb;">${new URL(user.website).hostname}</a>` : '-'}</td>
      <td><span class="badge badge-${user.status}">${user.status}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        <div class="actions">
          <button class="btn btn-primary btn-small" onclick="editUser(${user.id})">Edit</button>
          <button class="btn btn-danger btn-small" onclick="deleteUser(${user.id}, '${user.first_name} ${user.last_name}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Update pagination
  document.getElementById('users-page-info').textContent =
    `Page ${usersData.pagination.page} of ${usersData.pagination.totalPages}`;
  document.getElementById('users-prev').disabled = usersData.pagination.page === 1;
  document.getElementById('users-next').disabled = usersData.pagination.page >= usersData.pagination.totalPages;
};

// Update user stats
const updateUserStats = () => {
  document.getElementById('total-api-users').textContent = usersData.pagination.total;
  const activeCount = usersData.data.filter(u => u.status === 'active').length;
  document.getElementById('active-users').textContent = activeCount;
};

// Add user button
document.getElementById('btn-add-user').addEventListener('click', () => {
  document.getElementById('user-modal-title').textContent = 'Add New API User';
  document.getElementById('user-form').reset();
  document.getElementById('user-id').value = '';
  document.getElementById('user-status-group').classList.add('hidden');
  document.getElementById('user-modal').classList.add('show');
});

// Edit user
window.editUser = async (userId) => {
  const user = usersData.data.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('user-modal-title').textContent = 'Edit API User';
  document.getElementById('user-id').value = user.id;
  document.getElementById('user-first-name').value = user.first_name;
  document.getElementById('user-last-name').value = user.last_name;
  document.getElementById('user-email').value = user.email;
  document.getElementById('user-phone').value = user.phone || '';
  document.getElementById('user-website').value = user.website || '';
  document.getElementById('user-notes').value = user.notes || '';
  document.getElementById('user-status').value = user.status;
  document.getElementById('user-status-group').classList.remove('hidden');
  document.getElementById('user-modal').classList.add('show');
};

// Delete user
window.deleteUser = async (userId, userName) => {
  if (!confirm(`Are you sure you want to delete ${userName}? This will also delete all associated tokens.`)) {
    return;
  }

  const token = getAuthToken();
  try {
    const response = await fetch(`/api/admin/api-users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete user');

    alert('User deleted successfully');
    loadUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Failed to delete user');
  }
};

// User form submit
document.getElementById('user-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = document.getElementById('user-id').value;
  const userData = {
    firstName: document.getElementById('user-first-name').value,
    lastName: document.getElementById('user-last-name').value,
    email: document.getElementById('user-email').value,
    phone: document.getElementById('user-phone').value,
    website: document.getElementById('user-website').value,
    notes: document.getElementById('user-notes').value,
    status: document.getElementById('user-status').value || 'active'
  };

  const token = getAuthToken();
  const method = userId ? 'PUT' : 'POST';
  const url = userId ? `/api/admin/api-users/${userId}` : '/api/admin/api-users';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      document.getElementById('user-error').textContent = data.error;
      document.getElementById('user-error').style.display = 'block';
      return;
    }

    alert(userId ? 'User updated successfully' : 'User created successfully');
    document.getElementById('user-modal').classList.remove('show');
    loadUsers();
    loadAllUsersForDropdown(); // Refresh dropdown
  } catch (error) {
    console.error('Error saving user:', error);
    document.getElementById('user-error').textContent = 'Failed to save user';
    document.getElementById('user-error').style.display = 'block';
  }
});

// Cancel user modal
document.getElementById('cancel-user-btn').addEventListener('click', () => {
  document.getElementById('user-modal').classList.remove('show');
  document.getElementById('user-error').style.display = 'none';
});

// Users search and filter
document.getElementById('users-search').addEventListener('input', () => {
  usersPage = 1;
  loadUsers();
});

document.getElementById('users-sort').addEventListener('change', loadUsers);
document.getElementById('users-order').addEventListener('change', loadUsers);

// Users pagination
document.getElementById('users-prev').addEventListener('click', () => {
  if (usersPage > 1) {
    usersPage--;
    loadUsers();
  }
});

document.getElementById('users-next').addEventListener('click', () => {
  if (usersPage < usersData.pagination.totalPages) {
    usersPage++;
    loadUsers();
  }
});

// ========== API TOKENS MANAGEMENT ==========

// Load all users for dropdown
const loadAllUsersForDropdown = async () => {
  const token = getAuthToken();
  try {
    const response = await fetch('/api/admin/api-users?limit=1000&sortBy=first_name&sortOrder=ASC', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load users');

    const data = await response.json();
    allUsers = data.data;

    const select = document.getElementById('token-user');
    select.innerHTML = '<option value="">Select a user...</option>' +
      allUsers
        .filter(u => u.status === 'active')
        .map(u => `<option value="${u.id}">${u.first_name} ${u.last_name} (${u.email})</option>`)
        .join('');
  } catch (error) {
    console.error('Error loading users for dropdown:', error);
  }
};

// Load tokens
const loadTokens = async () => {
  const token = getAuthToken();
  const search = document.getElementById('tokens-search').value;
  const status = document.getElementById('tokens-status-filter').value;
  const sortBy = document.getElementById('tokens-sort').value;
  const sortOrder = document.getElementById('tokens-order').value;

  try {
    const params = new URLSearchParams({
      page: tokensPage,
      limit: 50,
      search,
      sortBy,
      sortOrder
    });

    if (status) params.append('status', status);

    const response = await fetch(`/api/admin/api-tokens?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load tokens');

    tokensData = await response.json();
    renderTokens();
    updateTokenStats();
  } catch (error) {
    console.error('Error loading tokens:', error);
    document.getElementById('tokens-table-body').innerHTML = `
      <tr><td colspan="8" style="text-align: center; color: #dc2626;">Error loading tokens</td></tr>
    `;
  }
};

// Render tokens table
const renderTokens = () => {
  const tbody = document.getElementById('tokens-table-body');

  if (tokensData.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #6b7280;">No tokens found</td></tr>';
    return;
  }

  tbody.innerHTML = tokensData.data.map(token => `
    <tr>
      <td>${token.id}</td>
      <td>${token.name}</td>
      <td>
        <div>${token.first_name} ${token.last_name}</div>
        <div style="font-size: 12px; color: #6b7280;">${token.user_email}</div>
      </td>
      <td><span class="badge badge-${token.status}">${token.status}</span></td>
      <td>${token.rate_limit}/hr</td>
      <td>${token.expires_at ? new Date(token.expires_at).toLocaleDateString() : 'Never'}</td>
      <td>${token.last_used_at ? new Date(token.last_used_at).toLocaleDateString() : 'Never'}</td>
      <td>
        <div class="actions">
          ${token.status === 'active' ? `<button class="btn btn-danger btn-small" onclick="revokeToken(${token.id}, '${token.name}')">Revoke</button>` : ''}
          <button class="btn btn-danger btn-small" onclick="deleteToken(${token.id}, '${token.name}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Update pagination
  document.getElementById('tokens-page-info').textContent =
    `Page ${tokensData.pagination.page} of ${tokensData.pagination.totalPages}`;
  document.getElementById('tokens-prev').disabled = tokensData.pagination.page === 1;
  document.getElementById('tokens-next').disabled = tokensData.pagination.page >= tokensData.pagination.totalPages;
};

// Update token stats
const updateTokenStats = async () => {
  const token = getAuthToken();
  try {
    // Get all tokens
    const allResponse = await fetch('/api/admin/api-tokens?limit=10000', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allData = await allResponse.json();

    document.getElementById('total-tokens').textContent = allData.pagination.total;
    document.getElementById('total-tokens-stat').textContent = allData.pagination.total;

    const activeCount = allData.data.filter(t => t.status === 'active').length;
    const inactiveCount = allData.data.filter(t => ['revoked', 'expired', 'inactive'].includes(t.status)).length;

    document.getElementById('active-tokens').textContent = activeCount;
    document.getElementById('inactive-tokens').textContent = inactiveCount;
  } catch (error) {
    console.error('Error loading token stats:', error);
  }
};

// Add token button
document.getElementById('btn-add-token').addEventListener('click', () => {
  loadAllUsersForDropdown();
  document.getElementById('token-form').reset();
  document.getElementById('token-rate-limit').value = '1000';
  document.getElementById('token-scope').value = 'read';
  document.getElementById('token-modal').classList.add('show');
});

// Token form submit
document.getElementById('token-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const tokenData = {
    userId: parseInt(document.getElementById('token-user').value),
    name: document.getElementById('token-name').value,
    expiresInDays: parseInt(document.getElementById('token-expires').value) || null,
    rateLimit: parseInt(document.getElementById('token-rate-limit').value),
    scope: document.getElementById('token-scope').value
  };

  if (!tokenData.userId) {
    document.getElementById('token-error').textContent = 'Please select a user';
    document.getElementById('token-error').style.display = 'block';
    return;
  }

  const token = getAuthToken();

  try {
    const response = await fetch('/api/admin/api-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tokenData)
    });

    const data = await response.json();

    if (!response.ok) {
      document.getElementById('token-error').textContent = data.error;
      document.getElementById('token-error').style.display = 'block';
      return;
    }

    // Show generated token
    document.getElementById('token-modal').classList.remove('show');
    document.getElementById('generated-token-display').textContent = data.token.token;
    document.getElementById('token-generated-modal').classList.add('show');

    loadTokens();
  } catch (error) {
    console.error('Error creating token:', error);
    document.getElementById('token-error').textContent = 'Failed to create token';
    document.getElementById('token-error').style.display = 'block';
  }
});

// Cancel token modal
document.getElementById('cancel-token-btn').addEventListener('click', () => {
  document.getElementById('token-modal').classList.remove('show');
  document.getElementById('token-error').style.display = 'none';
});

// Copy token to clipboard
document.getElementById('copy-token-btn').addEventListener('click', () => {
  const tokenText = document.getElementById('generated-token-display').textContent;
  navigator.clipboard.writeText(tokenText).then(() => {
    const btn = document.getElementById('copy-token-btn');
    btn.textContent = 'Copied!';
    btn.style.background = '#059669';
    setTimeout(() => {
      btn.textContent = 'Copy Token to Clipboard';
      btn.style.background = '#2563eb';
    }, 2000);
  });
});

// Close token generated modal
document.getElementById('close-token-generated-btn').addEventListener('click', () => {
  document.getElementById('token-generated-modal').classList.remove('show');
});

// Revoke token
window.revokeToken = async (tokenId, tokenName) => {
  const reason = prompt(`Enter reason for revoking token "${tokenName}":`);
  if (reason === null) return; // User cancelled

  const token = getAuthToken();
  try {
    const response = await fetch(`/api/admin/api-tokens/${tokenId}/revoke`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) throw new Error('Failed to revoke token');

    alert('Token revoked successfully');
    loadTokens();
  } catch (error) {
    console.error('Error revoking token:', error);
    alert('Failed to revoke token');
  }
};

// Delete token
window.deleteToken = async (tokenId, tokenName) => {
  if (!confirm(`Are you sure you want to delete token "${tokenName}"? This action cannot be undone.`)) {
    return;
  }

  const token = getAuthToken();
  try {
    const response = await fetch(`/api/admin/api-tokens/${tokenId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete token');

    alert('Token deleted successfully');
    loadTokens();
  } catch (error) {
    console.error('Error deleting token:', error);
    alert('Failed to delete token');
  }
};

// Tokens search and filter
document.getElementById('tokens-search').addEventListener('input', () => {
  tokensPage = 1;
  loadTokens();
});

document.getElementById('tokens-status-filter').addEventListener('change', () => {
  tokensPage = 1;
  loadTokens();
});

document.getElementById('tokens-sort').addEventListener('change', loadTokens);
document.getElementById('tokens-order').addEventListener('change', loadTokens);

// Tokens pagination
document.getElementById('tokens-prev').addEventListener('click', () => {
  if (tokensPage > 1) {
    tokensPage--;
    loadTokens();
  }
});

document.getElementById('tokens-next').addEventListener('click', () => {
  if (tokensPage < tokensData.pagination.totalPages) {
    tokensPage++;
    loadTokens();
  }
});

// Initialize
(async () => {
  const authenticated = await checkAuth();
  if (authenticated) {
    loadUsers();
    loadAllUsersForDropdown();
  }
})();
