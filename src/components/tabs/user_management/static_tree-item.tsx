                    <div
                        className={`flex items-center py-0.5 px-1 rounded-md text-sm font-medium justify-between 
                            ${isNodeSelected ? "bg-blue-100" : "hover:bg-gray-100"}
                            ${!isCheckboxSelected ? "text-gray-400 opacity-60" : "text-gray-900"}
                        `}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleItemClick}
                    > 