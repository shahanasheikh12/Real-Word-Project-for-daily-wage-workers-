import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust this import based on your project structure

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*');
      
    if (usersError) console.error("Error fetching users:", usersError);
    else setUsers(usersData || []);

    // Fetch jobs
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (jobsError) console.error("Error fetching jobs:", jobsError);
    else setJobs(jobsData || []);

    setLoading(false);
  };

  const markSafe = async (id) => {
    const { error } = await supabase
      .from('jobs')
      .update({ fraud_score: 0 })
      .eq('id', id);
      
    if (error) {
      console.error("Error marking job safe:", error);
    } else {
      // Update local state to reflect the change
      setJobs(jobs.map(job => job.id === id ? { ...job, fraud_score: 0 } : job));
    }
  };

  const removeJob = async (id) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', id);
      
    if (error) {
      console.error("Error removing job:", error);
    } else {
      // Update local state to reflect the change
      setJobs(jobs.map(job => job.id === id ? { ...job, status: 'cancelled' } : job));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-500">Loading Admin Dashboard...</div>
      </div>
    );
  }

  // Analytics Calculations
  const totalWorkers = users.filter(u => u.role === 'worker').length;
  const totalEmployers = users.filter(u => u.role === 'employer').length;
  const totalJobs = jobs.length;

  const jobsByStatus = {
    open: jobs.filter(j => j.status?.toLowerCase() === 'open').length,
    filled: jobs.filter(j => j.status?.toLowerCase() === 'filled').length,
    completed: jobs.filter(j => j.status?.toLowerCase() === 'completed').length,
    cancelled: jobs.filter(j => j.status?.toLowerCase() === 'cancelled').length,
  };

  // Recent 10 jobs
  const recentJobs = jobs.slice(0, 10);
  
  // Flagged jobs
  const flaggedJobs = jobs.filter(j => j.fraud_score > 60);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview, metrics, and moderation tools</p>
        </header>

        {/* Analytics Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Workers</h3>
            <p className="mt-2 text-4xl font-bold text-gray-900">{totalWorkers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Employers</h3>
            <p className="mt-2 text-4xl font-bold text-gray-900">{totalEmployers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Jobs Posted</h3>
            <p className="mt-2 text-4xl font-bold text-gray-900">{totalJobs}</p>
          </div>
        </section>

        {/* Jobs by Status */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Jobs by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col items-center">
              <span className="block text-sm text-blue-600 font-semibold uppercase tracking-wide">Open</span>
              <span className="mt-2 block text-3xl font-bold text-blue-900">{jobsByStatus.open}</span>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 flex flex-col items-center">
              <span className="block text-sm text-yellow-600 font-semibold uppercase tracking-wide">Filled</span>
              <span className="mt-2 block text-3xl font-bold text-yellow-900">{jobsByStatus.filled}</span>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex flex-col items-center">
              <span className="block text-sm text-green-600 font-semibold uppercase tracking-wide">Completed</span>
              <span className="mt-2 block text-3xl font-bold text-green-900">{jobsByStatus.completed}</span>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex flex-col items-center">
              <span className="block text-sm text-red-600 font-semibold uppercase tracking-wide">Cancelled</span>
              <span className="mt-2 block text-3xl font-bold text-red-900">{jobsByStatus.cancelled}</span>
            </div>
          </div>
        </section>

        {/* Flagged Jobs */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-red-50">
            <h2 className="text-xl font-semibold text-red-800">Flagged Jobs (Fraud Score &gt; 60)</h2>
            <p className="text-sm text-red-600 mt-1">These jobs require moderation due to high fraud risk.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fraud Score</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flaggedJobs.length > 0 ? (
                  flaggedJobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{job.id?.substring(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {job.fraud_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${job.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button 
                          onClick={() => markSafe(job.id)}
                          className="text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md border border-green-200 transition-colors"
                        >
                          Mark Safe
                        </button>
                        <button 
                          onClick={() => removeJob(job.id)}
                          className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={job.status === 'cancelled'}
                        >
                          {job.status === 'cancelled' ? 'Removed' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50">
                      No flagged jobs found at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Jobs Table */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Recent Job Submissions</h2>
            <p className="text-sm text-gray-500 mt-1">The 10 most recently created jobs on the platform.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employer ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fraud Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentJobs.length > 0 ? (
                  recentJobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{job.employer_id?.substring(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${job.status === 'open' ? 'bg-blue-100 text-blue-800' : 
                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'filled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`font-semibold ${job.fraud_score > 60 ? 'text-red-600' : 'text-gray-900'}`}>
                          {job.fraud_score || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50">
                      No jobs have been posted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
