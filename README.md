# Client

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Configuration

This app uses standard Angular environment files located in `src/environments`. Values such as `apiBaseUrl`, `socketUrl`, and `waApiUrl` are defined there:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000',
  waApiUrl: 'http://localhost:8040',
};
```

A `fileReplacements` entry in `angular.json` swaps in `environment.prod.ts` during production builds. This is the only place you need to change to switch between dev/prod environments.

### API endpoints

A small configuration object lives at `src/app/core/config/api.ts`. It follows this pattern:

```ts
export const API = {
  domain: environment.apiBaseUrl, // defined in environment files
  endPoint: {
    login: '/auth/login',
    logout: '/auth/logout',
    // add only the paths you actually need
  },
};
```

Keep the full hostname (`domain`) in your environment files (`environment.ts`/`environment.prod.ts`) so the code can switch easily between dev and prod. You can likewise define `WA_API` or other service domains the same way.

Services use `AppService` (a centralized HTTP wrapper) for GET/POST/PUT/DELETE calls, passing only the endpoint path.

### Socket support

A basic `SocketService` that wraps `socket.io-client` lives under `src/app/core/services`. Install the client package before using it:

```bash
npm install socket.io-client
```

### AppService

All HTTP requests go through `AppService` in `src/app/core/services/app.service.ts`. It provides:

- `get<T>(path, params?, options?)` – GET request
- `post<T>(path, body?, options?)` – POST request
- `put<T>(path, body?, options?)` – PUT request
- `delete<T>(path, params?, options?)` – DELETE request

Each method automatically prepends the configured API base URL and handles errors.


