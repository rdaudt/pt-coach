# Product Requirements Document (PRD)

## MVP 1 – Video Feedback Platform for Personal Trainers

## 1. Overview

### Product Name (working)

Video Coaching Portal

### Purpose

The product is a lightweight platform that allows **personal trainers (PTs) and their clients to exchange structured video-based training feedback**.

Clients upload training videos, and trainers review them and provide **timestamped feedback, written summaries, and optional voice notes**.

The system aims to improve:

* trainer–client communication
* training accountability
* coaching quality
* trainer professionalism and branding

This MVP focuses on **validating the workflow**, not on scalability or advanced analytics.

---

# 2. Goals

## Primary Goals

1. Enable **clients to easily upload training videos**
2. Enable **trainers to efficiently review and comment on videos**
3. Provide **structured feedback instead of chat-based communication**
4. Strengthen the **trainer-client relationship**
5. Provide **basic trainer branding** so the platform feels like part of the trainer’s business

---

## Non-Goals (MVP1)

The following are **explicitly out of scope** for MVP1:

* AI analysis
* real-time streaming
* chat messaging
* workout programming
* billing or subscription management
* multi-trainer organizations
* white-label domains
* mobile native apps
* social sharing
* advanced analytics

---

# 3. Target Users

## Personal Trainers (Primary User)

Independent trainers who:

* coach clients remotely
* review form videos
* communicate feedback frequently
* want a more professional workflow than messaging apps

Typical trainer profile:

* 5–50 active clients
* remote or hybrid coaching
* strength training, bodybuilding, powerlifting, or fitness coaching

---

## Clients (Secondary User)

Individuals training under a personal trainer who:

* record training sets
* want technique feedback
* want accountability from their coach

---

# 4. User Stories

## Client User Stories

### Upload video

As a client, I want to upload a training video so my coach can review my form.

### Label exercise

As a client, I want to label the exercise so my coach understands what I am performing.

### Add note

As a client, I want to add a short note describing the set.

Example:

* “felt heavy”
* “knee pain on rep 3”

### View feedback

As a client, I want to see my coach’s feedback clearly associated with the video.

### Receive notification

As a client, I want to know when my coach has reviewed my video.

---

## Trainer User Stories

### View submissions

As a trainer, I want to see all client video submissions in one place.

### Review video

As a trainer, I want to watch the video and analyze the client’s technique.

### Add timestamp comments

As a trainer, I want to leave comments at specific timestamps.

### Provide summary feedback

As a trainer, I want to write an overall summary of my feedback.

### Send feedback

As a trainer, I want to send feedback back to the client.

### Provide voice note

As a trainer, I want to attach a short voice message.

---

# 5. Trainer Branding

The platform should reflect the **trainer’s identity and business**, not just the platform brand.

## Trainer Branding Elements

Trainer profile may include:

* display name
* business name (optional)
* logo
* headshot
* website URL
* short bio

---

## Branding Surfaces

Trainer branding appears in:

### Client Dashboard

Header shows:

* trainer logo
* trainer name
* trainer business name

### Feedback Pages

Feedback pages display:

* trainer headshot
* trainer name
* branding header

### Emails

Notification emails include:

* trainer name
* trainer business identity

---

# 6. Core Features

## Authentication

Users must be able to:

* create account
* sign in
* sign out

Roles:

* trainer
* client

---

## Trainer–Client Relationship

Trainers must be able to:

* invite clients
* link clients to their account

Clients must only access content belonging to their trainer.

---

## Video Submission

Clients must be able to:

* upload a training video
* select an exercise
* add optional notes
* submit for trainer review

---

## Video Playback

Trainers must be able to:

* play video
* pause video
* scrub timeline
* view timestamps

---

## Trainer Feedback

Trainers must be able to:

* add timestamped comments
* write summary feedback
* upload voice note
* send feedback to client

---

## Client Feedback View

Clients must be able to:

* watch their submitted video
* see timestamped feedback
* read summary feedback
* play voice notes

---

## Notifications

System sends email notifications when:

* client uploads video
* trainer sends feedback

---

# 7. Core Screens

## Client Screens

* Login
* Dashboard
* Upload Video
* Submission List
* Submission Detail / Feedback

---

## Trainer Screens

* Login
* Dashboard (pending submissions)
* Client list
* Submission Review Page

---

# 8. Success Metrics

Success will be evaluated during the pilot.

Key metrics:

* % of clients uploading videos
* % of submissions reviewed by trainers
* average time to trainer feedback
* number of comments per submission
* repeat submissions per client

Qualitative metrics:

* trainer satisfaction
* client perceived coaching quality
* trainer willingness to continue using platform

---

# 9. Constraints

* MVP used by only **2 trainers and a small number of clients**
* system deployed on **Vercel**
* backend uses **Supabase**
* scalability not a concern

---

# 10. MVP Definition

MVP1 is complete when:

* trainers and clients can log in
* clients can upload training videos
* trainers can review videos
* trainers can send structured feedback
* clients can view feedback
* trainer branding appears in client interface

This MVP will validate the **core coaching workflow**.
