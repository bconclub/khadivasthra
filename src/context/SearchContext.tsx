"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SearchContextType {
    isSearchOpen: boolean;
    openSearch: () => void;
    closeSearch: () => void;
}

const SearchContext = createContext<SearchContextType>({
    isSearchOpen: false,
    openSearch: () => {},
    closeSearch: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <SearchContext.Provider
            value={{
                isSearchOpen,
                openSearch: () => setIsSearchOpen(true),
                closeSearch: () => setIsSearchOpen(false),
            }}
        >
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    return useContext(SearchContext);
}
