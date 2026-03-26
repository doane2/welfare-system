import axios from 'axios'

const API_BASE =
  typeof window === 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`
    : '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ── Attach JWT token to every request ────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('welfare_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Global response error handler ────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined') {
      const status = error.response?.status

      if (status === 401) {
        // Token expired or invalid — clear auth and redirect to login
        localStorage.removeItem('welfare_token')
        localStorage.removeItem('welfare_user')
        document.cookie = 'welfare_token=; Path=/; Max-Age=0'
        document.cookie = 'welfare_role=; Path=/; Max-Age=0'
        window.location.href = '/login'
      }

      // ── FIX: 403 no longer redirects to /dashboard ───────────────────────
      // The old behaviour caused an infinite reload loop for any account
      // whose dashboard API calls returned 403 — the redirect sent them
      // back to /dashboard, which triggered the same 403, endlessly.
      // Now we just log it and let the calling component handle the error.
      if (status === 403) {
        console.warn('403 Forbidden:', error.config?.url)
        // Do NOT redirect — just reject so the caller can handle it gracefully
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login          = (email: string, password: string) => api.post('/auth/login', { email, password })
export const getProfile     = () => api.get('/auth/profile')
export const changePassword = (currentPassword: string, newPassword: string) => api.put('/auth/change-password', { currentPassword, newPassword })

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getMemberDashboard = () => api.get('/dashboard/me')
export const getStatementData   = (params: any) => api.get('/dashboard/me/statement', { params })

// ── Members ───────────────────────────────────────────────────────────────────
export const getMembers   = (params?: any)              => api.get('/members', { params })
export const getMember    = (id: string)                => api.get(`/members/${id}`)
export const createMember = (data: any)                 => api.post('/members', data)
export const updateMember = (id: string, data: any)     => api.put(`/members/${id}`, data)
export const deleteMember = (id: string)                => api.delete(`/members/${id}`)

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroups             = (params?: any)                        => api.get('/groups', { params })
export const createGroup           = (data: any)                           => api.post('/groups', data)
export const updateGroup           = (id: string, data: any)               => api.put(`/groups/${id}`, data)
export const addMemberToGroup      = (groupId: string, memberId: string)   => api.post(`/groups/${groupId}/members`, { memberId })
export const removeMemberFromGroup = (groupId: string, memberId: string)   => api.delete(`/groups/${groupId}/members/${memberId}`)

// ── Contributions ─────────────────────────────────────────────────────────────
export const getMyContributions  = (params?: any)          => api.get('/contributions', { params })
export const createContribution  = (data: any)             => api.post('/contributions', data)
export const editContribution    = (id: string, data: any) => api.patch(`/contributions/${id}/edit`, data)
export const approveContribution = (id: string)            => api.patch(`/contributions/${id}/approve`)
export const rejectContribution  = (id: string)            => api.patch(`/contributions/${id}/reject`)
export const deleteContribution  = (id: string)            => api.delete(`/contributions/${id}`)

// ── Payments / M-Pesa ─────────────────────────────────────────────────────────
export const initiateSTKPush     = (data: any)                      => api.post('/mpesa/stk-push', data)
export const recordManualPayment = (data: any)                      => api.post('/mpesa/manual', data)
export const getPendingPayments  = (params?: any)                   => api.get('/mpesa/pending', { params })
export const approvePayment      = (id: string)                     => api.patch(`/mpesa/${id}/approve`)
export const rejectPayment       = (id: string, reason?: string)    => api.patch(`/mpesa/${id}/reject`, { reason })

// ── Claims ────────────────────────────────────────────────────────────────────
export const getClaims        = (params?: any)          => api.get('/claims', { params })
export const createClaim      = (data: any)             => api.post('/claims', data)
export const approveClaim     = (id: string)            => api.patch(`/claims/${id}/approve`)
export const rejectClaim      = (id: string)            => api.patch(`/claims/${id}/reject`)
export const addClaimDocument = (id: string, data: any) => api.post(`/claims/${id}/documents`, data)

// ── Loans ─────────────────────────────────────────────────────────────────────
export const getLoans           = (params?: any)                    => api.get('/loans', { params })
export const createLoan         = (data: any)                       => api.post('/loans', data)
export const approveLoan        = (id: string)                      => api.patch(`/loans/${id}/approve`)
export const rejectLoan         = (id: string)                      => api.patch(`/loans/${id}/reject`)
export const addLoanRepayment   = (id: string, amount: number)      => api.post(`/loans/${id}/repayments`, { amount })
export const getMemberLoanLimit = (memberId: string)                => api.get(`/loans/limit/${memberId}`)
export const setLoanEligibility = (memberId: string, data: any)     => api.patch(`/loans/eligibility/${memberId}`, data)

// ── Notifications ─────────────────────────────────────────────────────────────
export const getMyNotifications   = (params?: any) => api.get('/notifications/my', { params })
export const getNotifications     = (params?: any) => api.get('/notifications', { params })
export const markNotificationRead = (id: string)   => api.patch(`/notifications/${id}/read`)
export const markAllRead          = ()             => api.patch('/notifications/read-all')
export const deleteNotification   = (id: string)   => api.delete(`/notifications/${id}`)

// ── Announcements ─────────────────────────────────────────────────────────────
export const getActiveAnnouncements = ()             => api.get('/announcements/active')
export const getAnnouncements       = (params?: any) => api.get('/announcements', { params })
export const createAnnouncement     = (data: any)    => api.post('/announcements', data)
export const toggleAnnouncement     = (id: string)   => api.patch(`/announcements/${id}/toggle`)
export const deleteAnnouncement     = (id: string)   => api.delete(`/announcements/${id}`)

// ── Dependents ────────────────────────────────────────────────────────────────
export const getDependents   = (memberId: string)              => api.get(`/dependents/member/${memberId}`)
export const addDependent    = (memberId: string, data: any)   => api.post(`/dependents/member/${memberId}`, data)
export const updateDependent = (id: string, data: any)         => api.put(`/dependents/${id}`, data)
export const removeDependent = (id: string)                    => api.delete(`/dependents/${id}`)

// ── Beneficiary requests (member → admin via notifications) ───────────────────
export const getBeneficiaryRequests = (params?: any) => api.get('/notifications', {
  params: { ...params, type: 'BENEFICIARY_REQUEST', limit: 50 }
})

// ── Uploads ───────────────────────────────────────────────────────────────────
export const uploadProfilePhoto = (memberId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/uploads/members/${memberId}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const uploadClaimDocument = (claimId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/uploads/claims/${claimId}/document`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const getAuditLogs = (params?: any) => api.get('/audit-logs', { params })

// ── Reports ───────────────────────────────────────────────────────────────────
export const getAnnualReport    = (year: number) => api.get(`/reports/annual?year=${year}`)
export const getMembersReport   = (year: number) => api.get(`/reports/members?year=${year}`)
export const getFinancialReport = (year: number) => api.get(`/reports/financial?year=${year}`)
export const flagDeceased       = (data: any)    => api.post('/reports/deceased', data)
export const unflagDeceased     = (data: any)    => api.post('/reports/unflag-deceased', data)

export default api