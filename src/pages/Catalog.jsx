import React, { useEffect, useState } from 'react';
import Footer from '../components/common/Footer';
import { useParams } from 'react-router-dom';
import { apiConnector } from '../services/apiconnector';
import { categories } from '../services/apis';
import getCatalogPageData from '../services/operations/pageAndComponentData';
import Course_Card from '../components/core/Catalog/Course_Card';
import CourseSlider from '../components/core/Catalog/CourseSlider';

const Catalog = () => {
  const { catalogName } = useParams();
  const [catalogPageData, setCatalogPageData] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all categories
  useEffect(() => {
    const getCategories = async () => {
      try {
        const res = await apiConnector('GET', categories.CATEGORIES_API);
        const category = res?.data?.data?.find(
          (ct) => ct.name.split(' ').join('-').toLowerCase() === catalogName
        );
        if (category) {
          setCategoryId(category._id);
        } else {
          console.error('Category not found');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    getCategories();
  }, [catalogName]);

  // Fetch category details
  useEffect(() => {
    const getCategoryDetails = async () => {
      if (!categoryId) return;

      try {
        const res = await getCatalogPageData(categoryId);
        setCatalogPageData(res);
      } catch (error) {
        console.error('Error fetching catalog page data:', error);
      } finally {
        setLoading(false);
      }
    };
    getCategoryDetails();
  }, [categoryId]);

  if (loading) {
    return <div className="text-white text-center">Loading...</div>;
  }

  return (
    <div className="text-white">
      {/* Header Section */}
      <div className="p-4">
        <p>{`Home / Catalog / `}
          <span>{catalogPageData?.data?.selectedCategory?.name}</span>
        </p>
        <h1 className="text-2xl font-bold">
          {catalogPageData?.data?.selectedCategory?.name}
        </h1>
        <p className="text-gray-300">{catalogPageData?.data?.selectedCategory?.description}</p>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-8">
        {/* Section 1: Courses to get you started */}
        <div>
          <h2 className="text-xl font-semibold">Courses to get you started</h2>
          <div className="flex gap-x-3 my-2">
            <button className="py-1 px-4 bg-yellow-500 text-black rounded">Most Popular</button>
            <button className="py-1 px-4 bg-gray-700 rounded">New</button>
          </div>
          <CourseSlider courses={catalogPageData?.data?.selectedCategory?.courses || []} />
        </div>

        {/* Section 2: Top Courses */}
        <div>
          <h2 className="text-xl font-semibold">Top Courses in {catalogPageData?.data?.selectedCategory?.name}</h2>
          <CourseSlider courses={catalogPageData?.data?.differentCategory?.courses || []} />
        </div>

        {/* Section 3: Frequently Bought Together */}
        <div>
          <h2 className="text-xl font-semibold">Frequently Bought</h2>
          <div className="py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {catalogPageData?.data?.mostSellingCourses?.slice(0, 4).map((course, index) => (
              <Course_Card course={course} key={index} height="h-[400px]" />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Catalog;