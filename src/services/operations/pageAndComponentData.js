import toast from 'react-hot-toast';
import { apiConnector } from '../apiconnector';
import { catalogData } from '../apis';

const getCatalogPageData = async (categoryId) => {
    let result = [];
    try {
        const response = await apiConnector("POST", catalogData.CATALOGPAGEDATA_API, { categoryId });
        if (!response?.data?.success) {
            throw new Error("Could not fetch Category page data");
        }
        result = response?.data; // Assigning directly to the top-level `result`
    } catch (error) {
        console.error("Catalog Page data API Error", error);
        toast.error(error?.response?.data?.message || "Failed to fetch the category data");
        result = error.response?.data; // Still assign `error.response?.data` for further debugging
    } finally {
        return result; // Return the result in all cases
    }
};

export default getCatalogPageData;
