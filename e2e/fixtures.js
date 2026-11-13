// Fake API answers, so the browser tests don't depend on the live server being awake.
const instructor = { _id: "i1", firstName: "Meera", lastName: "Krishnan", image: "https://api.dicebear.com/9.x/initials/svg?seed=MK" };
const course = (id, name, price, hours) => ({
  _id: id, courseName: name, courseDescription: `${name} description`, price, thumbnail: "/demo/thumbs/javascript-from-scratch.jpg",
  instructor, ratingAndReviews: [], studentsEnrolled: [], tags: [], status: "Published", createdAt: "2026-11-01T00:00:00Z",
  totalSeconds: hours * 3600, lessonCount: 12,
});
const webDev = { _id: "cat-web", name: "Web Development", description: "Build websites and web apps.", courses: ["c1", "c2", "c3"] };

export const fixtures = {
  "GET /auth/providers": { success: true, data: { google: { clientId: "test.apps.googleusercontent.com" }, github: { clientId: "gh-test" } } },
  "GET /course/showAllCategories": { success: true, data: [webDev, { _id: "cat-devops", name: "DevOps", description: "Ship code.", courses: [] }] },
  "POST /course/getCategoryPageDetails": {
    success: true,
    data: {
      selectedCategory: { ...webDev, courses: [course("c1", "JavaScript from Scratch", 1499, 3.6), course("c2", "System Design for Beginners", 3999, 5.8), course("c3", "Modern CSS", 999, 2.5)] },
      differentCategory: null,
      mostSellingCourses: [],
    },
  },
  "GET /course/getAllCourses": { success: true, courses: [] },
  "GET /course/getReviews": { success: true, data: [] },
  "GET /course/paths": { success: true, data: [] },
  "GET /course/certificates/verify/SN-7K4Q-2M9X": {
    success: true,
    data: { code: "SN-7K4Q-2M9X", learnerName: "Priya Nair", courseName: "SQL for Data Analysts", instructorName: "Farah Siddiqui", lessons: 8, totalDuration: "2h 10m", issuedAt: "2026-11-12T10:00:00Z", courseId: "c9" },
  },
};
