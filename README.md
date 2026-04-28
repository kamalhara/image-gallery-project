## Performance Improvement Explanation

We implemented a two-tier caching strategy to improve performance and reduce unnecessary network requests. IndexedDB is used to persist image metadata such as IDs, URLs, and author details across browser sessions. On the first visit, data is fetched from the API and stored in IndexedDB. On subsequent visits, the application loads data directly from IndexedDB, eliminating the need for repeated API calls and significantly reducing load time.

In addition, an in-memory cache using a JavaScript Map stores already loaded images during the current session. This ensures that when users scroll back up, images render instantly without re-fetching or reprocessing.

IndexedDB was chosen over localStorage because it supports structured data, operates asynchronously without blocking the main thread, and provides larger storage capacity. Overall, this approach improves both initial load performance and user experience during navigation.
