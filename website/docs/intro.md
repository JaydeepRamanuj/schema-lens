---
id: intro
title: Introduction
sidebar_position: 1
---

# Introduction

`schema-lens` is a developer tool that caches your PostgreSQL schema locally and serves accurate answers to your AI agents (like Claude, Antigravity, and Cursor) in milliseconds. 

## When to use this tool
- You are tired of your AI agents writing slow `SELECT` queries just to understand the database schema.
- You have high latency due to network round-trips.
- Your agents frequently hallucinate column names or relationships because they lack complete schema context.
- You want a read-only, secure way to expose schema to an AI agent without giving it raw database credentials.

## When NOT to use this tool
- If your database is constantly changing and you need the absolute real-time structure *and* those changes aren't tracked via migrations.
- If you don't use PostgreSQL (currently `schema-lens` is optimized for PostgreSQL).
