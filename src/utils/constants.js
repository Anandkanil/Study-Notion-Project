export const ACCOUNT_TYPE = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    ADMIN: "Admin",
  }
  
  export const COURSE_STATUS = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
  }
/** Where each kind of account lands after logging in, and what "Dashboard" opens. */
export const homeFor = (accountType) =>
  accountType === ACCOUNT_TYPE.ADMIN
    ? "/dashboard/admin"
    : accountType === ACCOUNT_TYPE.INSTRUCTOR
      ? "/dashboard/instructor"
      : "/dashboard/enrolled-courses";
