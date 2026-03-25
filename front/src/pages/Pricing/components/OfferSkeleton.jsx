export default function OfferSkeleton() {
  return (
    <div className="premium-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col animate-pulse">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        
        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>

        <div className="flex gap-4">
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 bg-gray-50/50 dark:bg-gray-900/20 h-20">
        <div className="p-4 border-r border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2">
          <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="p-4 flex flex-col items-center justify-center gap-2">
          <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}
