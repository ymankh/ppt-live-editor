import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
export default tseslint.config(
 { ignores: ['dist/**','node_modules/**','src/components/ui/**','test-results/**','playwright-report/**'] },
 js.configs.recommended,
 ...tseslint.configs.strictTypeChecked,
 { files:['**/*.ts','**/*.tsx'],languageOptions:{parserOptions:{projectService:true,tsconfigRootDir:import.meta.dirname}},plugins:{'react-hooks':hooks,'jsx-a11y':a11y},rules:{...a11y.configs.recommended.rules,'jsx-a11y/label-has-associated-control':['error',{controlComponents:['Input','Textarea','Select','SelectTrigger'],depth:5}],'@typescript-eslint/no-explicit-any':'error','react-hooks/rules-of-hooks':'error','@typescript-eslint/no-confusing-void-expression':'off','@typescript-eslint/no-unnecessary-condition':'off','@typescript-eslint/restrict-template-expressions':['error',{allowNumber:true}],'@typescript-eslint/no-non-null-assertion':'error'} },
 // The keyboard-operated slide workspace is a focusable ARIA application; its role is read from strings.
 {files:['src/features/canvas/SlideCanvas.tsx'],rules:{'jsx-a11y/no-noninteractive-tabindex':['error',{roles:['application'],allowExpressionValues:true}],'jsx-a11y/no-noninteractive-element-interactions':['error',{div:['onKeyDown','onKeyUp']}] }},
 { files:['**/*.js'],extends:[tseslint.configs.disableTypeChecked],languageOptions:{globals:{console:'readonly',process:'readonly'}} }
);
