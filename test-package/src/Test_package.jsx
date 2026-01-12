export function Test_package(props) {
  return (
    <div className="text-lg p-10 border-8 border-black">My Test Package!!</div>
  );
}

export const test_button = ({ children, ...rest }) => {
  return <button {...rest}>{children}</button>;
};
