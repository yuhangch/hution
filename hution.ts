import {Client} from "https://deno.land/x/notion_sdk/src/mod.ts";
import {config} from "https://deno.land/x/dotenv/mod.ts";
import {JSZip} from "https://deno.land/x/jszip/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

if (Deno.args.length < 1) throw new Error("No slug appear");
const retry_interval = 1500;
const skip_line = 6;
const url_slug = Deno.args[0];
const sub_folder = Deno.args[1];

let title: string, date: string;
const categories: string[] = [];
const tags: string[] = [];
const notion_token = config().NOTION_TOKEN as string;
const notion_token_v2 = "token_v2=" + config().TOKEN_V2 as string;
const out_path = config().OUT as string;
const drafts_database_id = config().DRAFTS_DATABASE_ID as string;
const out_file_name = () => {
    const url_slug_md = url_slug + ".md"
    if (sub_folder)
        return path.join(out_path, sub_folder, url_slug_md);
    return path.join(out_path, url_slug_md)
}

const notion_api_v3_request_headers = new Headers({
    "Cookie": notion_token_v2,
    "Content-Type": "application/json",
});
if (!(notion_token && notion_token_v2 && drafts_database_id)) {
    throw new Error("Both 2 TOKEN and DRAFTS_DATABASE_ID in need");
}
const notion = new Client({
    auth: notion_token,
});
// fetch wrapper
const _fetch = async (url: string, options: RequestInit) => {
    let response = await fetch(url, options)
        .catch(error => {
            throw error;
        })
    return await response.json();
}
const handle_page = async (page: any) => {
    // parse page
    const slug_property = page.properties.Slug as any;
    const rich_text = slug_property.rich_text;
    if (rich_text.length < 1) return;
    else {
        const slug = rich_text[0].plain_text;
        if (slug !== url_slug) return;
        console.log("slug:" + slug);
    }
    // parse title
    const name_item = page.properties.Name as any;
    title = name_item.title[0].plain_text;
    console.log("title: " + title);

    // parse date
    date = page.created_time;
    console.log("date: " + date);

    // parse categories
    const categories_property = page.properties.Categories as any;
    const categories_multiselect = categories_property.multi_select;
    if (categories_multiselect.length > 0) {
        categories_multiselect.forEach((element: { name: string }) => {
            categories.push(element.name);
        });
        console.log("categories: " + categories);
    }
    // parse tags
    const tags_property = page.properties.Tags as any;
    const tags_multiselect = tags_property.multi_select;
    if (tags_multiselect.length > 0) {
        tags_multiselect.forEach((element: { name: string }) => {
            tags.push(element.name);
        });
        console.log("tag:" + tags);
    }

    const page_id = page.id;

    await create_task(page_id);
}
const create_task = async (block_id: string) => {
    console.log("creating export task ...");

    const request_options: RequestInit = {
        method: "POST",
        headers: notion_api_v3_request_headers,
        body: JSON.stringify({
            "task": {
                "eventName": "exportBlock",
                "request": {
                    "block": {"id": `${block_id}`},
                    "recursive": false,
                    "exportOptions": {
                        "exportType": "markdown",
                        "timeZone": "Asia/Shanghai",
                        "locale": "en",
                    },
                },
            },
        }),
        redirect: "follow",
    };

    let data: { taskId: string } = await _fetch("https://www.notion.so/api/v3/enqueueTask", request_options);

    console.log("task created with id: " + data.taskId);

    await get_task(data.taskId);
};

const get_task = async (task_id: string) => {
    console.log("try to fetch export task ...");
    let retry_count = 0;
    const retry = async () => {
        if (retry_count++ > 0) {
            console.log(`retry : ${retry_count}`);
        }
        await get_task(task_id);
    };
    const request_options: RequestInit = {
        method: "POST",
        headers: notion_api_v3_request_headers,
        body: JSON.stringify({
            "taskIds": [task_id],
        }),
        redirect: "follow",
    };

    let data: any = await _fetch(
        "https://www.notion.so/api/v3/getTasks",
        request_options,
    )
    if (data.results.length < 1) throw new Error("empty response, get task failed")
    data = data.results[0];
    if (data.state !== "success") {
        console.log(data.state);
        setTimeout(retry, retry_interval);
    } else {
        let status = data.status;
        if (status.exportURL) {
            await read_zip(status.exportURL);
        }
    }
};
const read_zip = async (url: string) => {
    console.log("reading markdown file in zip file");

    let response: Response = await fetch(url).catch((error) => {
        console.log(error);
        throw new Error("get zipped markdown failed");
    });
    let array_buffer = response.arrayBuffer();
    const zip = new JSZip();
    await zip.loadAsync(await array_buffer);
    const entries = Object.keys(zip.files()).map(name => name);
    if (entries.length > 0) {
        const name = entries[0];
        const content: string = await zip.file(name).async("string");
        await handle_markdown(content);
    }
};
const items_stringify = (items: string[]) =>
    "[" + items.map((i) => '"' + i + '"') + "]";
const handle_markdown = async (content: string) => {
    const header = [
        "---",
        "title: " + title,
        "date: " + date,
        "tags: " + items_stringify(tags),
        "categories: " + items_stringify(categories),
        "---"];

    const lines = content.split("\n");
    const md = header.concat(lines.slice(skip_line)).join("\n");
    await Deno.writeTextFile(out_file_name(), md);
    console.log(title + " written to " + out_file_name());
};

const Start = async () => {
    const drafts = await notion.databases.query({
        database_id: drafts_database_id,
    });
    drafts.results.forEach(handle_page);
};


await Start();
