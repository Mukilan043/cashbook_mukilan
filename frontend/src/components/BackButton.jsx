import { useNavigate, useParams } from 'react-router-dom';

const BackButton = () => {
  const navigate = useNavigate();
  const { cashbookId } = useParams();

  const handleBack = () => {
    if (cashbookId) {
      navigate(`/cashbook/${cashbookId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 bg-white bg-opacity-80 px-4 py-2 rounded-lg shadow-sm"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>Back</span>
    </button>
  );
};

export default BackButton;

