import * as React from "react";

// function FilterProvider({ children }) {
// 	const value = { state, dispatch }
// 	return <CountContext.Provider value={value}>{children}</CountContext.Provider>
// }

// function useCount() {
// 	const context = React.useContext(CountContext)
// 	if (context === undefined) {
// 		throw new Error('useCount must be used within a CountProvider')
// 	}
// 	return context
// }

// export { CountProvider, useCount }

export const FilterContext = React.createContext(0);
