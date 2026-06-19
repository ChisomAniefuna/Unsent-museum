
Build a cinematic, immersive web application interface, compatible across mobile, desktop, iPad and every other devices  for “The Unsent Museum”, The app should be responsive across screens

The experience should feel like a real digital museum, not a normal website. It should move from landing page → emotional doors opening → room video experience → visitor memory form → generated artifact reveal → public museum of artifacts. I attached the door to the prompt to use it. The doors are the assets. 

The design should feel premium, emotional, soft, cinematic, poetic , and interactive.

Core idea:
The Unsent Museum is a place where people submit unsent messages, memories, apologies, confessions, or reflections. The system transforms each message into a unique animated emotional artifact.The artifact is viewed when a user checks the gallery for said emotions. No two visitors should ever receive the same artifact. The shader design for the various emotions will be uploaded with this, so you can use it and iterate on things based on the seeds given.  

I am uploading a png of the door, converting the door background into transparent so it can fit the landing page screen and not look dirty when a user hovers on it.
LANDING PAGE

Create a full-screen landing page for The Unsent Museum.

The landing page should feel like someone is standing outside an emotional museum. It should not look like a normal SaaS landing page.

Layout:
- Full-screen cinematic background.
- Museum entrance.
- Large emotional headline.
- Short poetic description.
- Main CTA button.
- Secondary CTA for exploring the museum.

Copy:
Headline:
“The Unsent Museum”

Subheadline:
“A living museum of the things we never said.”

When the user selects a door, it lifts up, when they hover on it, it slits open a bit and they can see the ray colour of the room, clicking again makes them enter it.  Buttons:
Primary: “Enter the Museum”
Secondary: “Explore Artifacts”click on a 

Interaction:
When the user clicks “Enter the Museum”, transition into the museum corridor. Do not instantly jump. I attached the video they will be using when they get into the room.


MUSEUM CORRIDOR

The landing page, show a long immersive corridor with emotional doors.after the user enters it,

The corridor should feel like a real museum hallway:

Each door represents one emotional room:
1. Love
2. Regret
3. Grief
4. Hope
5. Closure

The corridor should contain; 

Example:
Love
“Things the heart kept saying.”
Currently inside: 128
Show 5 small circular avatars, then “+123”.

Regret
“Where choices echo.”
Currently inside: 74

Grief
“Where absence becomes shape.”
Currently inside: 91

Hope
“Where light returns slowly.”
Currently inside: 156

Closure
“Where endings learn to rest.”
Currently inside: 62

Real-time room presence:
- Show how many people are currently inside each room.
- Show small anonymous avatars or initials.
- Use generated soft avatar circles if the visitor is anonymous.
- Update presence in real time.
- If a real-time backend is not available yet, create a clean mock presence system that can later connect to Supabase, Firebase, or WebSocket.

DOOR OPENING INTERACTION

When a user clicks an emotion door, the door should open like a real door.

The door animation should feel physical and cinematic:
- The selected door grows slightly on hover.
- The light behind the door becomes brighter.
- On click, the door rotates open using a 3D transform.
- Add a shadow that moves correctly with the door.
- Behind the door, reveal the video- The camera moves forward through the doorway.


Important:
Do not make it feel like a basic page switch.
Make it feel like entering a real emotional room.

Technical direction:
- Use CSS 3D transforms or Framer Motion.
- The door should have a transform-origin on the left or right.
- Use perspective on the parent container.
- Add a dark overlay during transition.
- Prevent visual artifacts around the image edges.
- Avoid showing ugly image shadows or cutout edges.

EMOTIONAL ROOM VIDEO EXPERIENCE

After entering a room, show a full-screen immersive video experience.

Grief video link: https://player.cloudinary.com/embed/?cloud_name=dofuxlbmq&public_id=Grief_video_hx8uwk
Hopevideo Link: https://player.cloudinary.com/embed/?cloud_name=dofuxlbmq&public_id=Grief_video_hx8uwk
Closure video link: https://res.cloudinary.com/dofuxlbmq/video/upload/v1781534772/Closure_video_xtmue4.mp4
Regret video link: https://res.cloudinary.com/dofuxlbmq/video/upload/v1781215901/Regret_axzl9b.mp4
Love video link: https://res.cloudinary.com/dofuxlbmq/video/upload/v1781127346/love_zxrvf8.mp4
Each emotional room should have:
- A  background video..
- Current people inside the room.
- Avatar stack of visitors currently present.
- Button to submit an unsent message.
- Button to explore artifacts from this room.

Build a cinematic video background system for the museum rooms.

The room video should play once, then transition into an infinite boomerang-style loop without showing a hard cut.

Requirements:

1. Render a <video> element with:
   - autoPlay
   - muted
   - playsInline
   - preload="metadata"
   - crossOrigin="anonymous" only when the video is served with correct CORS headers.

2. The video should play through once when the visitor enters the room.

3. While the video plays, capture frames using requestVideoFrameCallback where supported.

4. Do not capture every single frame into separate canvases.
   Instead, capture an optimized frame buffer:
   - max width: 720px on mobile
   - max width: 960px on desktop
   - target playback fps: 24–30fps
   - cap the total stored frames to avoid memory issues
   - store ImageBitmap frames where possible instead of many canvas elements
   - release unused frames from memory when the user leaves the room.

5. If requestVideoFrameCallback is unsupported, use a safe fallback:
   - requestAnimationFrame-based capture
   - or simple video loop fallback
   - avoid aggressive setInterval capture at 60fps.

6. When the video ends:
   - fade the video out softly
   - fade the visible canvas in
   - play the captured frames in a boomerang pattern:
     forward → reverse → forward
   - repeat infinitely.

7. The visible canvas should fill the full room:
   - wrapper: absolute inset-0 w-full h-full overflow-hidden
   - video: w-full h-full object-cover
   - canvas: w-full h-full

8. The canvas drawing logic must preserve object-cover behavior manually.
   Do not stretch the captured frame.
   Draw the frame using cover-style cropping so the video keeps its cinematic aspect ratio.

9. Add a dark gradient overlay above the video/canvas so room text remains readable.

10. Add a poster image or loading state while the video prepares.

11. Respect prefers-reduced-motion:
   - if reduced motion is enabled, show a still poster or very slow fade instead of boomerang playback.

12. Performance is more important than capturing every frame.
   The museum must feel smooth on mobile and desktop.


The video should fill the room beautifully:
- Full-screen video background.
- Object-fit: cover.
- Smooth fade-in.
- No lagging.
- Lazy-load video only when the user enters the room.
- Use poster images while video loads.
- Autoplay muted loop playsInline.
- Respect reduced-motion settings.


Room layout example:
Top-left:
“The Room of Closure”

Subtitle:
“For the words that finally found somewhere to rest.”

Top-right:
“62 people inside”
Avatar stack.

Center/bottom:
Button: “Leave an Unsent Message”
Secondary: “View Artifacts”

When the user clicks “Leave an Unsent Message”, open the artifact form as a beautiful glass modal or slide-up panel.



ARTIFACT CREATION FORM

Create a beautiful form where visitors submit their unsent message and generate their own artifact.

The form should feel intimate, not corporate.

Form title:
“Leave something unsent.”

Description:
“Write the message, memory, apology, confession, or feeling you never sent. The museum will transform it into a living artifact.”

Fields:
1. Emotion room
- Auto-selected based on the room the user entered.
- User can change it if needed.

2. Unsent message
- Large emotional text area.
- Placeholder:
  “I never told you that…”

3. Optional title
- Placeholder:
  “Give this memory a name”

4. Optional details
- Placeholder:
  “Add context, a date, a place, or a feeling…”

5. Display name
- Placeholder:
  “Your name or initials”
- Only required if not anonymous.

6. Anonymous toggle
- Label: “Make this anonymous”
- If ON:
  - Do not show your name on artifact card.
  - Show “Anonymous Visitor”.
  - Use generated anonymous avatar.
- If OFF:
  - Show display name on card.
  - Show chosen avatar or initials.

7. Visibility setting
- Public in Museum
- Private to Me
- Unlisted with Share Link

8. Consent checkbox
- “I understand that public artifacts may be seen, liked, shared, or downloaded by other visitors.”

Button:
“Generate My Artifact”

Loading state:
After clicking, show a poetic generation sequence:
- “Reading emotional texture…”
- “Extracting memory fragments…”
- “Shaping artifact DNA…”
- “Giving it motion…”
- “Placing it in the museum…”

The generation should feel magical.

UNIQUE ARTIFACT GENERATION SYSTEM

No two people should receive the same artifact.

The system should not select from a fixed list of artifact templates only.
It should generate a unique artifact DNA for every submission.

Artifact DNA should be based on:
- User message
- Emotion room
- Message length
- Sentiment
- Intensity
- Writing rhythm
- Themes
- Timestamp
- User/session ID
- Random salt
- Deterministic seed

Store artifact DNA, not only the rendered image/video.

Each artifact should include:
- id
- emotion
- title
- message excerpt
- full message privacy state
- display name or anonymous state
- avatar
- generated seed
- color palette
- shape family
- motion behavior
- texture type
- particle behavior
- artifact description
- creation date
- likes count
- shares count
- downloads count
- visibility setting


When the same family appears, the final artifact must be different through:
ARTIFACT REVEAL SCREEN

After generation, show the visitor’s artifact in a dramatic reveal.

The reveal should feel like the artifact is being born inside the museum.

The artifacts are set in the gallery. 

Example:
Title:
“Glass Seed of Closure”

Interpretation:
“This artifact carries the feeling of something finally settling. Its slow green pulse represents release without forgetting.”

Actions:
- Like
- Share
- Download
- Save to Museum
- Explore Similar Artifacts
- Enter Museum of Artifacts

If artifact is anonymous:
Show:
“Anonymous Visitor”

If not anonymous:
Show:
“Created by Chisom” or the visitor’s chosen display name.

If private:
Show:
“Only you can see this artifact.”

If public:
Show:
“Now showing in the Museum of Artifacts.”


MUSEUM OF ARTIFACTS

After the artifact is generated, take the visitor to a gallery of artifacts.

This should feel like a living museum wall, not a basic grid.

Gallery features:
- Masonry or cinematic card layout.
- Filter by emotion.
- Filter by newest, most liked, most shared.
- Search by title, theme, or emotion.
- Infinite scroll.
- Featured artifacts section.
- Current live visitors counter.
- Soft animated museum ambience.

Each artifact card should show:
- Artifact preview
- Emotion tag
- Title
- Short message excerpt
- Creator name or “Anonymous Visitor”
- Like count
- Share button
- Download button
- Creation date
- Small motion preview

Card behavior:
- On hover, the artifact gently animates.
- On click, open the full artifact detail view.
- If the user chose to be anonymous, the card must clearly show “Anonymous Visitor”.
- If user chose not to show their name, do not expose name anywhere.
- If private, do not show in the public gallery.

Artifact card example:
Emotion: Closure
Title: “The Door That Stayed Open”
Message excerpt: “I think I finally understand why you left…”
By: Anonymous Visitor
Likes: 241
Actions: Like, Share, Download

ARTIFACT DETAIL PAGE

When a visitor clicks an artifact, open a full detail page or modal.

Show:
- Large animated artifact.
- Title.
- Emotion.
- Creator display state.
- Full message only if public and allowed.
- If message is private, show only generated interpretation.
- Like button.
- Share button.
- Download button.
- Report button.
- Similar artifacts.
- Button to create your own artifact.

Include:
“This artifact was generated from an unsent message in the Room of Closure.”

Do not reveal hidden private details.
Respect anonymous mode completely.


LIKING, SHARING, AND DOWNLOADING

Add interaction features.

Like:
- Users can like artifacts.
- Prevent repeated likes from same session/user.
- Animate the like button with a soft glow or pulse.

Share:
- Allow sharing by link.
- Generate a shareable artifact page.
- Use native share API on mobile when available.
- Copy link fallback.

Download:
- Allow downloading artifact as image.
- Optional: allow downloading short animated version if supported.
- Download should include artifact visual, title, emotion, and museum branding.
- Do not include private message text unless the creator allowed it.

Privacy:
- Public artifacts can be liked, shared, and downloaded.
- Private artifacts can only be downloaded by the creator.
- Unlisted artifacts can be shared only through direct link.


REAL-TIME ROOM PRESENCE

Every emotional room should show how many people are currently inside.

Display:
- “128 people are in this room”
- Small avatar stack
- Anonymous visitors shown with generated abstract avatars
- Named visitors shown only if they allow it

Presence behavior:
- When user enters a room, add them to that room’s presence.
- When user leaves, remove them.
- Update count live.
- Show soft animated avatar circles.
- Do not show full personal details.
- If anonymous mode is enabled, show only “Anonymous Visitor”.

For MVP:
Use mock live counts that feel alive.

For production:
Use Supabase Realtime, Firebase presence, or WebSocket presence.


ANONYMITY RULES

The user must be able to choose whether their identity appears.

Anonymous ON:
- Show “Anonymous Visitor”.
- Hide display name.
- Use anonymous generated avatar.
- Do not show personal details on card, gallery, detail page, share page, or download.

Anonymous OFF:
- Show display name or initials.
- Show chosen avatar or generated initials avatar.

Also allow:
- Hide message but show artifact.
- Show excerpt only.
- Show full message.
- Private artifact.
- Public artifact.
- Unlisted artifact.

The privacy settings must be clear before generation.


VISUAL STYLE

The interface should feel like:
- Immersive museum
- Cinematic digital gallery
- Soft emotional world
- Premium interactive experience
- Beautiful enough for social sharing

Avoid:
- Normal dashboard design
- Basic rectangular cards
- Harsh colors
- Cheap gradients
- Generic AI look
- Cluttered UI
- Too much text
- Flat boring layout

Use:
- Glassmorphism carefully
- Soft shadows
- Atmospheric lighting
- Large emotional typography
- Smooth transitions
- Subtle particles
- Depth
- Video rooms
- Door opening animation
- Living artifact cards
- Hover motion


TECHNICAL REQUIREMENTS

Use:
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand or React state for interface state
- Supabase/Firebase-ready structure for future data
- Responsive design
- Mobile-first optimization
- Accessible buttons and labels
- Reduced motion support
- Lazy loading for videos and artifact previews
- Optimized video playback
- Clean component structure

Suggested components:
- AppShell
- LandingPage
- MuseumCorridor
- EmotionDoor
- DoorTransition
- EmotionRoom
- RoomVideoBackground
- PresenceAvatars
- ArtifactForm
- ArtifactGenerationLoader
- ArtifactReveal
- ArtifactGallery
- ArtifactCard
- ArtifactDetailModal
- ShareModal
- DownloadArtifactButton
- PrivacyControls

Data models:
EmotionRoom:
- id
- name
- colorPalette
- videoUrl
- description
- visitorCount
- activeVisitors
- doorStyle

Artifact:
- id
- emotion
- title
- message
- messageVisibility
- creatorDisplayName
- isAnonymous
- avatar
- artifactDNA
- previewUrl
- animationConfig
- createdAt
- likes
- shares
- downloads
- visibility

ArtifactDNA:
- seed
- shapeFamily
- palette
- motionType
- textureType
- particleType
- intensity
- rhythm
- emotionalThemes
- geometrySettings
- shaderSettings

FINAL EXPERIENCE FLOW

1. User lands on The Unsent Museum.
2. They click “Enter the Museum”.
3. They move into a cinematic corridor.
4. They see emotional doors.
5. Each door shows current visitor count and avatars.
6. User clicks a door.
7. Door opens physically with 3D animation.
8. User enters emotional video room.
9. Room video plays full-screen.
10. User sees room title, visitor count, avatars, and CTA.
11. User clicks “Leave an Unsent Message”.
12. User fills the artifact form.
13. User chooses anonymous or visible identity.
14. User chooses public/private/unlisted visibility.
15. User clicks “Generate My Artifact”.
16. System creates unique artifact DNA(I attached the artifacts that you will be working on or changing) each documents contains all the artifact.
17. User sees artifact reveal.
18. User can like, share, download, or save artifact.
19. User enters Museum of Artifacts.
20. User explores other artifacts.
21. User can filter by emotion, like, share, download, and create another artifact.

Make the whole experience feel emotionally alive, immersive, and worthy of a museum.




