import { Skeleton } from "./ui/skeleton";

interface IndustryButtonProps {
  industryName: string;
  isLoading: boolean;
  onClick: () => void;
}

const IndustryButton: React.FC<IndustryButtonProps> = ({ industryName, isLoading, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1 border border-black dark:border-none dark:bg-sky-700 rounded-full transition-colors hover:bg-gray-100"
      disabled={isLoading}
    >
      {isLoading ? (
        <Skeleton className="w-20 h-4" />
      ) : (
        <h1 className="text-sm">{industryName}</h1>
      )}
    </button>
  );
};

export default IndustryButton;