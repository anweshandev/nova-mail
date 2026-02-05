/**
 * API Service - Handles all HTTP requests to the NovaMail backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL;

console.log({
	...import.meta.env,
})

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Get stored auth token
 */
function getToken() {
  const authData = localStorage.getItem('novamail-auth');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed.state?.token;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Make an authenticated API request
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Handle non-JSON responses (like file downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError('Request failed', response.status);
    }
    return response;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || 'Request failed',
      response.status,
      data.details
    );
  }

  return data;
}

/**
 * Auth API
 */
export const authApi = {
  async login(credentials) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async logout() {
    return request('/auth/logout', { method: 'POST' });
  },

  async verify() {
    return request('/auth/verify', { method: 'POST' });
  },

  async autoconfig(email) {
    return request('/auth/autoconfig', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

/**
 * Emails API
 */
export const emailsApi = {
  async list(folder = 'INBOX', options = {}) {
    const params = new URLSearchParams({
      folder,
      limit: options.limit || 50,
      offset: options.offset || 0,
      ...(options.search && { search: options.search }),
    });
    return request(`/emails?${params}`);
  },

  async search(query, folder = 'INBOX', limit = 50) {
    const params = new URLSearchParams({ q: query, folder, limit });
    return request(`/emails/search?${params}`);
  },

  async get(folder, uid, markAsRead = true) {
    const params = new URLSearchParams({ markAsRead });
    return request(`/emails/${encodeURIComponent(folder)}/${uid}?${params}`);
  },

  async getAttachment(folder, uid, attachmentId) {
    const response = await request(
      `/emails/${encodeURIComponent(folder)}/${uid}/attachment/${attachmentId}`
    );
    return response.blob();
  },

  async send(emailData) {
    return request('/emails/send', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  },

  async sendWithAttachments(emailData, files) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(emailData));
    files.forEach(file => formData.append('files', file));
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/emails/send`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.message || 'Failed to send email', response.status);
    }
    return data;
  },

  async reply(folder, uid, replyData) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/reply`, {
      method: 'POST',
      body: JSON.stringify(replyData),
    });
  },

  async forward(folder, uid, forwardData) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/forward`, {
      method: 'POST',
      body: JSON.stringify(forwardData),
    });
  },

  async saveDraft(draftData) {
    return request('/emails/draft', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });
  },

  async markAsRead(folder, uid, read) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ read }),
    });
  },

  async toggleStar(folder, uid, starred) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/star`, {
      method: 'PATCH',
      body: JSON.stringify({ starred }),
    });
  },

  async move(folder, uid, targetFolder) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetFolder }),
    });
  },

  async copy(folder, uid, targetFolder) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/copy`, {
      method: 'POST',
      body: JSON.stringify({ targetFolder }),
    });
  },

  async delete(folder, uid, permanent = false) {
    const params = new URLSearchParams({ permanent });
    return request(`/emails/${encodeURIComponent(folder)}/${uid}?${params}`, {
      method: 'DELETE',
    });
  },

  async batchMarkAsRead(emails, read) {
    return request('/emails/batch/read', {
      method: 'POST',
      body: JSON.stringify({ emails, read }),
    });
  },

  async batchDelete(emails, permanent = false) {
    return request('/emails/batch/delete', {
      method: 'POST',
      body: JSON.stringify({ emails, permanent }),
    });
  },

  async batchMove(emails, targetFolder) {
    return request('/emails/batch/move', {
      method: 'POST',
      body: JSON.stringify({ emails, targetFolder }),
    });
  },

  async batchStar(emails, starred) {
    return request('/emails/batch/star', {
      method: 'POST',
      body: JSON.stringify({ emails, starred }),
    });
  },

  async batchArchive(emails) {
    return request('/emails/batch/archive', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });
  },

  async batchSpam(emails) {
    return request('/emails/batch/spam', {
      method: 'POST',
      body: JSON.stringify({ emails }),
    });
  },

  async markAsImportant(folder, uid, important) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/important`, {
      method: 'PATCH',
      body: JSON.stringify({ important }),
    });
  },

  async archive(folder, uid) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/archive`, {
      method: 'POST',
    });
  },

  async markAsSpam(folder, uid) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/spam`, {
      method: 'POST',
    });
  },

  async markAsNotSpam(folder, uid) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/not-spam`, {
      method: 'POST',
    });
  },

  async getStarred(limit = 100) {
    const params = new URLSearchParams({ limit });
    return request(`/emails/starred?${params}`);
  },

  async getThread(folder, uid) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/thread`);
  },

  async updateDraft(folder, uid, draftData) {
    return request(`/emails/draft/${encodeURIComponent(folder)}/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(draftData),
    });
  },

  async deleteDraft(folder, uid) {
    return request(`/emails/draft/${encodeURIComponent(folder)}/${uid}`, {
      method: 'DELETE',
    });
  },

  async sync(folder = 'INBOX', uidNext = null) {
    const params = new URLSearchParams({ folder });
    if (uidNext) params.append('uidNext', uidNext);
    return request(`/emails/sync?${params}`);
  },

  async getUnreadCounts() {
    return request('/emails/unread-counts');
  },

  async addLabel(folder, uid, label) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/label`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  },

  async removeLabel(folder, uid, label) {
    return request(`/emails/${encodeURIComponent(folder)}/${uid}/label/${encodeURIComponent(label)}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Folders API
 */
export const foldersApi = {
  async list() {
    return request('/folders');
  },

  async getStatus(path) {
    return request(`/folders/${encodeURIComponent(path)}/status`);
  },

  async getAllStatus() {
    return request('/folders/all-status');
  },

  async create(name, parent = null) {
    return request('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent }),
    });
  },

  async rename(path, newName) {
    return request(`/folders/${encodeURIComponent(path)}`, {
      method: 'PATCH',
      body: JSON.stringify({ newName }),
    });
  },

  async delete(path) {
    return request(`/folders/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  },

  async empty(path) {
    return request(`/folders/${encodeURIComponent(path)}/empty`, {
      method: 'POST',
    });
  },
};

/**
 * Settings API
 */
export const settingsApi = {
  async get() {
    return request('/settings');
  },

  async update(settings) {
    return request('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
  },

  async getLabels() {
    return request('/settings/labels');
  },

  async createLabel(name, color) {
    return request('/settings/labels', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  },

  async updateLabel(id, name, color) {
    return request(`/settings/labels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, color }),
    });
  },

  async deleteLabel(id) {
    return request(`/settings/labels/${id}`, {
      method: 'DELETE',
    });
  },
};

export { ApiError };
