// Role Management JavaScript

// Authentication state
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// State
let usersCurrentPage = 1;
let usersTotalPages = 1;
let isUsersLoading = false;

let auditCurrentPage = 1;
let auditTotalPages = 1;
let isAuditLoading = false;

let currentView = 'users'; // 'users' or 'audit'
let availableRoles = [];

// Get DOM elements
const userNameSpan = document.getElementById('user-name');

// Tab elements
const tabUsers = document.getElementById('tab-users');
const tabAudit = document.getElementById('tab-audit');
const usersSection = document.getElementById('users-section');
const auditSection = document.getElementById('audit-section');

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

// Audit section elements
const auditSearchInput = document.getElementById('audit-search-input');
const auditSortField = document.getElementById('audit-sort-field');
const auditSortOrder = document.getElementById('audit-sort-order');
const auditPageSize = document.getElementById('audit-page-size');
const auditTableBody = document.getElementById('audit-table-body');
const auditPrevButton = document.getElementById('audit-prev-page');
const auditNextButton = document.getElementById('audit-next-page');
const auditPageInfo = document.getElementById('audit-page-info');
const totalAuditEl = document.getElementById('total-audit');

// Change role modal elements
const changeRoleModal = document.getElementById('change-role-modal');
const changeRoleForm = document.getElementById('change-role-form');
const changeUserId = document.getElementById('change-user-id');
const changeUserName = document.getElementById('change-user-name');
const changeCurrentRole = document.getElementById('change-current-role');
const changeNewRole = document.getElementById('change-new-role');
const changeReason = document.getElementById('change-reason');
const changeRoleError = document.getElementById('change-role-error');
const cancelChangeBtn = document.getElementById('cancel-change-btn');
const roleDescription = document.getElementById('role-description');

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

      // Check if user is Top Gun
      if (currentUser.role !== 'Top Gun') {
        alert('Access denied. Top Gun role required to access Role Management.');
        window.location.href = '/reguser';
        return false;
      }

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

// Initialize page
async function initializePage() {
  const isAuthenticated = await verifyToken();

  if (!isAuthenticated) {
    window.location.href = '/reguser';
    return;
  }

  // Display user name with Top Gun badge
  userNameSpan.innerHTML = `${currentUser.firstName} ${currentUser.lastName} <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px; vertical-align: middle;">⭐ TOP GUN</span>`;

  // Fetch available roles
  await fetchRoles();

  // Fetch initial data
  fetchUsers();
}

// Fetch available roles
async function fetchRoles() {
  try {
    const response = await fetch('/api/admin/roles', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      availableRoles = data.roles;
    }
  } catch (error) {
    console.error('Error fetching roles:', error);
  }
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

// Tab switching
function switchTab(view) {
  currentView = view;

  if (view === 'users') {
    usersSection.classList.add('active');
    auditSection.classList.remove('active');
    tabUsers.classList.add('active');
    tabAudit.classList.remove('active');
  } else if (view === 'audit') {
    usersSection.classList.remove('active');
    auditSection.classList.add('active');
    tabUsers.classList.remove('active');
    tabAudit.classList.add('active');
    fetchAuditLog();
  }
}

// Fetch and display users
async function fetchUsers() {
  if (isUsersLoading || !authToken) return;

  isUsersLoading = true;
  usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Loading...</td></tr>';

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
        window.location.href = '/reguser';
        return;
      }
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();

    // Update pagination info
    usersTotalPages = data.pagination.totalPages;
    usersPageInfo.textContent = `Page ${usersCurrentPage} of ${usersTotalPages}`;
    totalUsersEl.textContent = data.pagination.total.toLocaleString();

    // Update pagination buttons
    usersPrevButton.disabled = usersCurrentPage <= 1;
    usersNextButton.disabled = usersCurrentPage >= usersTotalPages;

    // Render table
    renderUsersTable(data.data);

  } catch (error) {
    console.error('Error fetching users:', error);
    usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">Error loading data</td></tr>';
  } finally {
    isUsersLoading = false;
  }
}

// Render users table
function renderUsersTable(users) {
  if (users.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No users found</td></tr>';
    return;
  }

  usersTableBody.innerHTML = users.map(user => {
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A';
    const roleBadgeClass = getRoleBadgeClass(user.role);
    const isCurrentUser = user.id === currentUser.id;

    return `
      <tr>
        <td>${user.id}</td>
        <td>${user.first_name} ${user.last_name}</td>
        <td>${user.email}</td>
        <td><span class="role-badge ${roleBadgeClass}">${user.role || 'Webapp Admin'}</span></td>
        <td style="font-size: 12px;">${createdAt}</td>
        <td>
          <button
            class="btn btn-primary btn-small change-role-btn"
            data-id="${user.id}"
            data-name="${user.first_name} ${user.last_name}"
            data-email="${user.email}"
            data-role="${user.role || 'Webapp Admin'}"
            ${isCurrentUser ? 'disabled title="Cannot change your own role"' : ''}
          >
            Change Role
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners to change role buttons
  document.querySelectorAll('.change-role-btn').forEach(btn => {
    btn.addEventListener('click', handleChangeRoleClick);
  });
}

// Get role badge class
function getRoleBadgeClass(role) {
  if (role === 'Top Gun') return 'top-gun';
  if (role === 'Read Only Admin') return 'read-only-admin';
  return 'webapp-admin';
}

// Handle change role button click
function handleChangeRoleClick(event) {
  const btn = event.target;
  const id = btn.getAttribute('data-id');
  const name = btn.getAttribute('data-name');
  const email = btn.getAttribute('data-email');
  const role = btn.getAttribute('data-role');

  // Populate form
  changeUserId.value = id;
  changeUserName.value = `${name} (${email})`;
  changeCurrentRole.value = role;
  changeNewRole.value = '';
  changeReason.value = '';
  roleDescription.textContent = '';
  changeRoleError.style.display = 'none';

  // Show modal
  changeRoleModal.style.display = 'flex';
}

// Update role description when new role is selected
changeNewRole.addEventListener('change', (e) => {
  const selectedRole = e.target.value;
  const role = availableRoles.find(r => r.name === selectedRole);

  if (role) {
    roleDescription.textContent = role.description;
  } else {
    roleDescription.textContent = '';
  }
});

// Handle change role form submission
changeRoleForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userId = changeUserId.value;
  const newRole = changeNewRole.value;
  const reason = changeReason.value.trim();

  if (!newRole) {
    changeRoleError.textContent = 'Please select a new role';
    changeRoleError.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole, reason: reason || null })
    });

    const data = await response.json();

    if (response.ok) {
      // Close modal and refresh users
      changeRoleModal.style.display = 'none';
      await fetchUsers();
      alert(`Role changed successfully from "${data.previousRole}" to "${data.newRole}"`);
    } else {
      changeRoleError.textContent = data.error || 'Failed to change role';
      changeRoleError.style.display = 'block';
    }
  } catch (error) {
    console.error('Error changing role:', error);
    changeRoleError.textContent = 'Network error. Please try again.';
    changeRoleError.style.display = 'block';
  }
});

// Cancel change role
cancelChangeBtn.addEventListener('click', () => {
  changeRoleModal.style.display = 'none';
});

// Close modal when clicking outside
changeRoleModal.addEventListener('click', (e) => {
  if (e.target === changeRoleModal) {
    changeRoleModal.style.display = 'none';
  }
});

// Fetch and display audit log
async function fetchAuditLog() {
  if (isAuditLoading || !authToken) return;

  isAuditLoading = true;
  auditTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: auditCurrentPage,
      limit: auditPageSize.value,
      search: auditSearchInput.value.trim(),
      sortBy: auditSortField.value,
      sortOrder: auditSortOrder.value
    });

    const response = await fetch(`/api/admin/role-audit?${params}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        authToken = null;
        window.location.href = '/reguser';
        return;
      }
      throw new Error('Failed to fetch audit log');
    }

    const data = await response.json();

    // Update pagination info
    auditTotalPages = data.pagination.totalPages;
    auditPageInfo.textContent = `Page ${auditCurrentPage} of ${auditTotalPages}`;
    totalAuditEl.textContent = data.pagination.total.toLocaleString();

    // Update pagination buttons
    auditPrevButton.disabled = auditCurrentPage <= 1;
    auditNextButton.disabled = auditCurrentPage >= auditTotalPages;

    // Render table
    renderAuditTable(data.data);

  } catch (error) {
    console.error('Error fetching audit log:', error);
    auditTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">Error loading data</td></tr>';
  } finally {
    isAuditLoading = false;
  }
}

// Render audit table
function renderAuditTable(records) {
  if (records.length === 0) {
    auditTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No audit records found</td></tr>';
    return;
  }

  auditTableBody.innerHTML = records.map(record => {
    const createdAt = new Date(record.created_at).toLocaleString();
    const previousRoleBadge = record.previous_role ? `<span class="role-badge ${getRoleBadgeClass(record.previous_role)}">${record.previous_role}</span>` : '<i>None</i>';
    const newRoleBadge = `<span class="role-badge ${getRoleBadgeClass(record.new_role)}">${record.new_role}</span>`;

    return `
      <tr>
        <td style="font-size: 12px;">${createdAt}</td>
        <td>${record.first_name} ${record.last_name}<br><small style="color: #6b7280;">${record.email}</small></td>
        <td>${previousRoleBadge}</td>
        <td>${newRoleBadge}</td>
        <td>${record.changed_by_first_name} ${record.changed_by_last_name}</td>
        <td style="max-width: 200px;">${record.change_reason || '<i style="color: #9ca3af;">No reason provided</i>'}</td>
      </tr>
    `;
  }).join('');
}

// Event listeners for users section
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

// Event listeners for audit section
auditSearchInput.addEventListener('input', debounce(() => {
  auditCurrentPage = 1;
  fetchAuditLog();
}, 500));

auditSortField.addEventListener('change', () => {
  auditCurrentPage = 1;
  fetchAuditLog();
});

auditSortOrder.addEventListener('change', () => {
  auditCurrentPage = 1;
  fetchAuditLog();
});

auditPageSize.addEventListener('change', () => {
  auditCurrentPage = 1;
  fetchAuditLog();
});

auditPrevButton.addEventListener('click', () => {
  if (auditCurrentPage > 1) {
    auditCurrentPage--;
    fetchAuditLog();
  }
});

auditNextButton.addEventListener('click', () => {
  if (auditCurrentPage < auditTotalPages) {
    auditCurrentPage++;
    fetchAuditLog();
  }
});

// Tab switching event listeners
tabUsers.addEventListener('click', () => switchTab('users'));
tabAudit.addEventListener('click', () => switchTab('audit'));

// Initialize page on load
document.addEventListener('DOMContentLoaded', initializePage);
