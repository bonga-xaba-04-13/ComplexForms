# Project Sample 1 - Angular SCSS Styled Project

A modern Angular application with SCSS styling support.

## Features

- **Angular 21** - Latest Angular framework
- **SCSS Styling** - Advanced stylesheet preprocessing
- **Responsive Design** - Mobile-first approach
- **Component-based** - Reusable, modular components
- **Type-safe** - Full TypeScript support
- **Standalone Components** - Modern Angular architecture

## Project Structure

```
Project_Sample1/
├── src/
│   ├── app/
│   │   ├── app.ts              # Root component
│   │   ├── app.html            # Root template
│   │   ├── app.scss            # Component styles
│   │   ├── app.config.ts       # App configuration
│   │   ├── app.routes.ts       # Route configuration
│   │   └── app.spec.ts         # Tests
│   ├── index.html              # HTML entry point
│   ├── main.ts                 # Bootstrap file
│   └── styles.scss             # Global styles
├── public/                      # Static assets
├── angular.json                # Angular CLI config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v10 or higher)

### Installation

```bash
cd Project_Sample1
npm install
```

### Development Server

Run the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

Build the project for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Running Tests

Execute unit tests via Vitest:

```bash
npm test
```

## SCSS Styling

This project uses SCSS for all stylesheets. Key features:

- **Variables** - Defined in root styles for easy theming
- **Mixins** - Reusable style patterns
- **Nesting** - Cleaner, more maintainable stylesheets
- **Functions** - Dynamic style calculations
- **Responsive Design** - Media queries for all breakpoints

### Global Variables

```scss
:root {
  --primary-color: #3f51b5;
  --secondary-color: #ff4081;
  --accent-color: #4dd0e1;
  --text-primary: #212121;
  --text-secondary: #757575;
}
```

## Component Example

```typescript
// home.component.ts
import { Component } from '@angular/core';
import './home.component.scss';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  title = 'Home';
}
```

```scss
// home.component.scss
.home-container {
  padding: 2rem;
  background-color: var(--background-color);

  h1 {
    color: var(--primary-color);
  }
}
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.
