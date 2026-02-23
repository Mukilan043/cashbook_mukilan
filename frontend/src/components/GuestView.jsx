import { Link } from 'react-router-dom';

const GuestView = () => {
  return (
    <div 
      className="min-h-screen bg-gray-100 pb-20"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bg-black bg-opacity-40 min-h-screen">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-white drop-shadow-lg">
              Cash Book Application
            </h1>
            
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4 shadow-lg">
              <p className="text-sm text-yellow-900 text-center font-semibold">
                You are viewing as a guest. You can explore all features but cannot perform any actions.
              </p>
              <p className="text-sm text-yellow-800 text-center mt-2">
                <Link to="/login" className="underline font-semibold text-blue-600 hover:text-blue-800">Login</Link> or{' '}
                <Link to="/signup" className="underline font-semibold text-green-600 hover:text-green-800">Sign Up</Link> to start managing your cash flow!
              </p>
            </div>
          </div>

          {/* Features Overview */}
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Welcome to Cash Book</h2>
            <p className="text-white text-lg mb-8 drop-shadow-md">Explore the features below. Login to start managing your cash flow!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-xl border-2 border-green-300">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="font-semibold text-green-800 mb-2 text-lg">Cash Inflow</h3>
                <p className="text-sm text-green-700">Record money coming into your account</p>
              </div>
              
              <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-xl border-2 border-red-300">
                <div className="text-4xl mb-3">💸</div>
                <h3 className="font-semibold text-red-800 mb-2 text-lg">Cash Outflow</h3>
                <p className="text-sm text-red-700">Track money going out of your account</p>
              </div>
              
              <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-xl border-2 border-blue-300">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="font-semibold text-blue-800 mb-2 text-lg">View & Manage</h3>
                <p className="text-sm text-blue-700">Edit or delete your transactions</p>
              </div>
              
              <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-xl border-2 border-purple-300">
                <div className="text-4xl mb-3">📜</div>
                <h3 className="font-semibold text-purple-800 mb-2 text-lg">View History</h3>
                <p className="text-sm text-purple-700">See chronological records with running balance</p>
              </div>
              
              <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-xl border-2 border-indigo-300">
                <div className="text-4xl mb-3">📄</div>
                <h3 className="font-semibold text-indigo-800 mb-2 text-lg">Generate Report</h3>
                <p className="text-sm text-indigo-700">Export PDF reports with summaries</p>
              </div>
              
              <div className="bg-white bg-opacity-95 p-6 rounded-lg shadow-xl border-2 border-yellow-300">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="font-semibold text-yellow-800 mb-2 text-lg">Multiple Cashbooks</h3>
                <p className="text-sm text-yellow-700">Organize transactions by category or project</p>
              </div>
            </div>

            <div className="mt-12">
              <Link
                to="/login"
                className="inline-block bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold text-lg hover:bg-blue-700 shadow-lg mr-4"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-block bg-green-600 text-white py-3 px-8 rounded-lg font-semibold text-lg hover:bg-green-700 shadow-lg"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestView;
