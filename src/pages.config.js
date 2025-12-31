import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Expenses": Expenses,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Expenses",
    Pages: PAGES,
    Layout: __Layout,
};