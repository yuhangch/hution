# Hution

> inspired by [notion-exporter](https://github.com/yannbolliger/notion-exporter)

hugo <- notion, get formatted hugo post markdown from notion by slug.

### Use

1. Create a integration copy the `Internal Integration Token`, then share your target database to this integration, reference [official guildes](https://developers.notion.com/docs/getting-started).
2. Copy `token_v2` from Cookie, reference [this](https://www.notion.so/Find-Your-Notion-Token-5da17a8df27a4fb290e9e3b5d9ba89c4).
3. Duplicate `.env.example` name to `.env` and configure it.
4. Install [Deno](https://deno.land/) reference https://deno.land/manual/getting_started/installation .
5. Run script use [Deno](https://deno.land/).

```shell
❯ deno run --allow-env --allow-net --allow-read --allow-write hution.ts post-title-slug
slug:post-title-slug
title: Post title
date: 2022-01-08T02:37:00.000Z
categories:category-1
tag:tag1
creating export task ...
task created with id: f7f65c5b-0c87-436c-b522-79b34a4650e8
try to fetch export task ...
reading markdown file in zip file
Post title written to /Users/yuhang/codes/blog/content/posts/post-title-slug.md

```
written markdown's format as follow:
```markdown
---
title: Post title
date: 2022-01-08T02:37:00.000Z
tags: ["tag1"]
categories: ["category-1"]
---

Content for post
```
then you only focus on your hugo blog publish workflow.

### .env

```config
NOTION_TOKEN=your-notion-api-token
TOKEN_V2=your-token_v2-in-cookie
DRAFTS_DATABASE_ID=database-id
OUT=/repos/blog/content/posts
```

- `NOTION_TOKEN`: find target page/block
- `DRAFTS_DATABASE_ID`: specify database which to save post drafts.
- `TOKEN_V2`: access official inner api to export page to markdown.
- `OUT`: blog posts root directory.

### Expected page format

Assume there is a database named "Post Drafts", specify it's id to `.env`, "Post Drafts" has several pages in follow structure:

- `title` **required**
- `created time` **required**
- `Tags` multi select property **required**
- `Categories` multi select property **required**
- `Slug` text property **required**

### Run

```shell
git clone https://github.com/yuhangch/hution.git
cd hution
deno run --allow-env --allow-net --allow-read --allow-write hution.ts post-slug
```

or specify a sub folder, markdown will written to `$OUT/category-1`

```shell
deno run --allow-env --allow-net --allow-read --allow-write hution.ts post-slug category-1
```

or use online script

```shell
deno run --allow-env --allow-net --allow-read --allow-write https://raw.githubusercontent.com/yuhangch/hution/master/hution.ts post-slug
```
or use cdn `https://cdn.jsdelivr.net/gh/yuhangch/hution@master/hution.ts`

or compile script as a executable file, reference [this](https://deno.land/manual/tools/compiler#compiling-executables).

### More

This script only test by simple content (`plain text`, `numbered list`, etc...), in complex cases requires further testing, below is a description of the stability from [notion-exporter](https://github.com/yannbolliger/notion-exporter), it also applies to hution.

> This tool completely relies on the export/download feature of the official but internal Notion.so API. The advantage is, that we do not generate any markup ourselves, just download and extract some ZIPs. While the download feature seems to be pretty stable, keep in mind that it still is an internal API, so it may break anytime.
