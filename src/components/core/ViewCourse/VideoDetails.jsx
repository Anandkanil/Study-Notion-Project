import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import "video-react/dist/video-react.css";
import { BigPlayButton, Player } from "video-react";

import { markLectureAsComplete } from "../../../services/operations/courseDetailsAPI";
import { updateCompletedLectures } from "../../../slices/viewCourseSlice";
import IconBtn from "../../common/IconBtn";

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoPlayerRef = useRef(null);
  const dispatch = useDispatch();

  const { token } = useSelector((state) => state.auth);
  const { courseSectionData, courseEntireData, completedLectures } =
    useSelector((state) => state.viewCourse);

  const [currentVideoData, setCurrentVideoData] = useState(null);
  const [courseThumbnail, setCourseThumbnail] = useState("");
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch and set the video details on component mount or route change
  // eslint-disable-next-line
  useEffect(() => {
    (async () => {
      if (!courseSectionData.length) return;

      if (!courseId || !sectionId || !subSectionId) {
        navigate(`/dashboard/enrolled-courses`);
        return;
      }

      const selectedSection = courseSectionData.find(
        (section) => section._id === sectionId
      );
      const selectedSubSection = selectedSection?.subSection.find(
        (subSection) => subSection._id === subSectionId
      );

      setCurrentVideoData(selectedSubSection || null);
      setCourseThumbnail(courseEntireData.thumbnail || "");
      setIsVideoEnded(false);
    })();
  }, [courseSectionData, courseEntireData, location.pathname]);

  // Check if the current lecture is the first video in the course
  const isFirstVideo = () => {
    const sectionIndex = courseSectionData.findIndex(
      (section) => section._id === sectionId
    );
    const subSectionIndex = courseSectionData[sectionIndex]?.subSection.findIndex(
      (subSection) => subSection._id === subSectionId
    );
    return sectionIndex === 0 && subSectionIndex === 0;
  };

  // Navigate to the next video
  const navigateToNextVideo = () => {
    const sectionIndex = courseSectionData.findIndex(
      (section) => section._id === sectionId
    );
    const totalSubSections = courseSectionData[sectionIndex].subSection.length;
    const subSectionIndex = courseSectionData[sectionIndex]?.subSection.findIndex(
      (subSection) => subSection._id === subSectionId
    );

    if (subSectionIndex < totalSubSections - 1) {
      const nextSubSectionId =
        courseSectionData[sectionIndex].subSection[subSectionIndex + 1]._id;
      navigate(`/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`);
    } else {
      const nextSectionId = courseSectionData[sectionIndex + 1]._id;
      const nextSubSectionId = courseSectionData[sectionIndex + 1].subSection[0]._id;
      navigate(`/view-course/${courseId}/section/${nextSectionId}/sub-section/${nextSubSectionId}`);
    }
  };

  // Check if the current lecture is the last video in the course
  const isLastVideo = () => {
    const sectionIndex = courseSectionData.findIndex(
      (section) => section._id === sectionId
    );
    const totalSubSections = courseSectionData[sectionIndex]?.subSection.length;
    const subSectionIndex = courseSectionData[sectionIndex]?.subSection.findIndex(
      (subSection) => subSection._id === subSectionId
    );

    return (
      sectionIndex === courseSectionData.length - 1 &&
      subSectionIndex === totalSubSections - 1
    );
  };

  // Navigate to the previous video
  const navigateToPreviousVideo = () => {
    const sectionIndex = courseSectionData.findIndex(
      (section) => section._id === sectionId
    );
    const subSectionIndex = courseSectionData[sectionIndex]?.subSection.findIndex(
      (subSection) => subSection._id === subSectionId
    );

    if (subSectionIndex > 0) {
      const previousSubSectionId =
        courseSectionData[sectionIndex].subSection[subSectionIndex - 1]._id;
      navigate(`/view-course/${courseId}/section/${sectionId}/sub-section/${previousSubSectionId}`);
    } else {
      const previousSectionId = courseSectionData[sectionIndex - 1]._id;
      const lastSubSectionIndex =
        courseSectionData[sectionIndex - 1].subSection.length - 1;
      const lastSubSectionId =
        courseSectionData[sectionIndex - 1].subSection[lastSubSectionIndex]._id;
      navigate(`/view-course/${courseId}/section/${previousSectionId}/sub-section/${lastSubSectionId}`);
    }
  };

  // Mark the lecture as completed
  const markLectureComplete = async () => {
    setIsLoading(true);
    const response = await markLectureAsComplete(
      { courseId, subsectionId: subSectionId },
      token
    );
    if (response) {
      dispatch(updateCompletedLectures(subSectionId));
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 text-white">
      {!currentVideoData ? (
        <img
          src={courseThumbnail}
          alt="Preview"
          className="h-full w-full rounded-md object-cover"
        />
      ) : (
        <Player
          ref={videoPlayerRef}
          aspectRatio="16:9"
          playsInline
          onEnded={() => setIsVideoEnded(true)}
          src={currentVideoData?.videoUrl}
        >
          <BigPlayButton position="center" />
          {isVideoEnded && (
            <div className="absolute inset-0 z-[100] grid gap-5 h-full place-content-center bg-gradient-to-t from-black via-black/70 to-transparent">
              {!completedLectures.includes(subSectionId) && (
                <IconBtn
                  disabled={isLoading}
                  onclick={markLectureComplete}
                  text={!isLoading ? "Mark As Completed" : "Loading..."}
                  // eslint-disable-next-line
                  style={"text-xl max-w-max px-4 mx-auto"}
                />
              )}
              <IconBtn
                disabled={isLoading}
                onclick={() => {
                  if (videoPlayerRef?.current) {
                    videoPlayerRef?.current?.seek(0);
                    setIsVideoEnded(false);
                  }
                }}
                text="Rewatch"
                // eslint-disable-next-line
                style={"text-xl max-w-max px-4 mx-auto mt-2"}
              />
              <div className="mt-10 flex min-w-[250px] justify-center gap-x-4 text-xl">
                {!isFirstVideo() && (
                  <button
                    disabled={isLoading}
                    onClick={navigateToPreviousVideo}
                    className="blackButton"
                  >
                    Prev
                  </button>
                )}
                {!isLastVideo() && (
                  <button
                    disabled={isLoading}
                    onClick={navigateToNextVideo}
                    className="blackButton"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </Player>
      )}
      <h1 className="mt-4 text-3xl font-semibold">{currentVideoData?.title}</h1>
      <p className="pt-2 pb-6">{currentVideoData?.description}</p>
    </div>
  );
};

export default VideoDetails;
