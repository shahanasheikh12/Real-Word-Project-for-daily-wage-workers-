import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  async function toggleVerified(userId, current) {
    const { error } = await supabase.from('users').update({ id_verified: !current }).eq('id', userId)
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, id_verified: !current } : u))
  }

  async function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId)
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="font-display font-extrabold text-2xl mb-6 text-gray-900">Manage Users</h2>
      
      {loading ? (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden p-4 flex flex-col gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton w-full h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-display font-bold text-sm text-gray-600">Name</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600">Role</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600">City</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600">Trust Score</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600">Verified</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600">Status</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600">Joined</th>
                <th className="p-4 font-display font-bold text-sm text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-display font-bold text-sm text-gray-900">
                    {user.name || 'Unnamed'}
                  </td>
                  <td className="p-4 text-sm capitalize text-gray-600">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'employer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{user.city || '—'}</td>
                  <td className="p-4 text-sm font-mono text-gray-600">
                    {user.trust_score ? `${Number(user.trust_score).toFixed(1)} ★` : '—'}
                  </td>
                  <td className="p-4 text-sm">
                    {user.role === 'worker' ? (
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        user.id_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user.id_verified ? 'Verified' : 'Unverified'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      user.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.role === 'worker' && (
                        <label className="flex items-center gap-2 cursor-pointer mr-2">
                          <input
                            type="checkbox"
                            checked={!!user.id_verified}
                            onChange={() => toggleVerified(user.id, user.id_verified)}
                            className="w-4 h-4 text-brand-black border-gray-300 rounded focus:ring-brand-black"
                          />
                          <span className="text-xs font-bold text-gray-700">Verified</span>
                        </label>
                      )}
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => toggleStatus(user.id, user.status)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                            user.status === 'suspended' 
                              ? 'border-green-200 text-green-700 hover:bg-green-50'
                              : 'border-red-200 text-red-700 hover:bg-red-50'
                          }`}
                        >
                          {user.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
