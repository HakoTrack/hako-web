import Feed from "./features/feed/Feed.svelte";
import Landing from "./features/landing/Landing.svelte";
import Profile from "./features/profile/Profile.svelte";
import MediaDetail from "./features/media/MediaDetail.svelte";
import CharacterDetail from "./features/character/CharacterDetail.svelte";
import StaffDetail from "./features/staff/StaffDetail.svelte";
import SignupPage from "./features/auth/SignupPage.svelte";

import Browse from "./features/browse/Browse.svelte";

import ForumThread from "./features/forum/ForumThread.svelte";

export interface Route {
  path: string;
  component: any;
  props: (path: string, user: any, profile: any, activeTab: string, mediaType: string) => any;
}

export const routes: Route[] = [
  {
    path: "/character/",
    component: CharacterDetail,
    props: (path) => ({ characterId: path.split("/")[2] })
  },
  {
    path: "/staff/",
    component: StaffDetail,
    props: (path) => ({ staffId: path.split("/")[2] })
  },
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
    path: "/browse/",
    component: Browse,
    props: (path) => ({ mediaType: path.split("/")[2] || "anime" })
  },
  {
    path: "/feed",
    component: Feed,
    props: (_, user) => ({ user })
  },
  {
    path: "/signup",
    component: SignupPage,
    props: () => ({})
  },
  {
    path: "/forum/",
    component: ForumThread,
    props: (path) => {
      const parts = path.split("/").filter(Boolean);
      return { threadId: Number(parts[1]), postId: parts[2] ? Number(parts[2]) : null };
    }
  }
];
