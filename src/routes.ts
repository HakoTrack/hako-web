import Feed from "./views/Feed.svelte";
import Profile from "./views/Profile.svelte";
import MediaDetail from "./views/MediaDetail.svelte";

export interface Route {
  path: string;
  component: any;
  props: (path: string, user: any, profile: any, activeTab: string, mediaType: string) => any;
}

export const routes: Route[] = [
  {
    path: "/user/",
    component: Profile,
    props: (path, user, profile, activeTab, mediaType) => ({
      currentPath: path,
      activeTab,
      mediaType,
      user,
      profileData: profile
    })
  },
  {
    path: "/anime/",
    component: MediaDetail,
    props: (path) => ({ mediaId: path.split("/")[2], type: "anime" })
  },
  {
    path: "/manga/",
    component: MediaDetail,
    props: (path) => ({ mediaId: path.split("/")[2], type: "manga" })
  },
  {
    path: "/lightnovel/",
    component: MediaDetail,
    props: (path) => ({ mediaId: path.split("/")[2], type: "light_novel" })
  },
  {
    path: "/feed",
    component: Feed,
    props: (_, user) => ({ user })
  }
];
